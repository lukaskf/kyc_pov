from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
import io
from PIL import Image
import openai
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date

app = Flask(__name__)
ENV = os.environ.get('ENV', 'development')
ALLOWED_ORIGIN = 'http://localhost:3000' if ENV == 'development' else 'https://www.withwell.com'

CORS(app, resources={r"/*": {
    "origins": [ALLOWED_ORIGIN],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "expose_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response


@app.route('/fireworks', methods=['POST'])
def fireworks_upload():
    # Get the image from the form data
    image_file = request.files['file']
    if image_file.filename == '':
        return jsonify({"status": "error", "message": "No selected image"}), 400
    elif not image_file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        return jsonify({"status": "error", "message": "Invalid image format. Must be PNG, JPG, or JPEG"}), 400
    
    # Read the file data and create image object
    image_data = image_file.read()
    image = Image.open(io.BytesIO(image_data))
    
    # Convert RGBA to RGB if necessary
    if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
        image = background
    
    # Compress and convert to base64
    output_buffer = io.BytesIO()
    image.save(output_buffer, format='JPEG', quality=10, optimize=True)
    compressed_image = output_buffer.getvalue()
    base64_image = base64.b64encode(compressed_image).decode('utf-8')

    # Define the Pydantic model and Fireworks request
    class Person(BaseModel):
        # Personal info
        first_name: str
        last_name: str
        middle_name: Optional[str] = None
        dob: date
        
        # Document info
        doc_type: Literal["passport", "drivers_license"]
        doc_number: str
        expiry: date
        
        # Address
        address: Optional[str] = None 
        city: Optional[str] = None
        country: str
        postal_code: Optional[str] = None
        state: Optional[str] = None

        # Passport-specific fields
        place_of_birth: Optional[str] = None
        issuing_authority: Optional[str] = None


    client = openai.OpenAI(
        base_url = "https://api.fireworks.ai/inference/v1",
        api_key = "fireworks-api-key",
    )
    
    response = client.chat.completions.create(
        model = "accounts/fireworks/models/llama-v3p2-90b-vision-instruct",
        response_format={"type": "json_object", "schema": Person.model_json_schema()},
        messages = [
            {
                "role": "system",
                "content": "You are a helpful AI assistant that specializes in analyzing images and providing detailed, accurate descriptions. Focus on text and important details present in the image. If a field is not present in the image, leave it blank."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Please analyze this image and extract the information of the person in the image"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ]
    )

    content = response.choices[0].message.content
    
    return jsonify({"status": "success", "message": "Image processed successfully", "response": content}), 200


if __name__ == '__main__':
    app.run(debug=True, port=os.getenv("PORT", default=5000))