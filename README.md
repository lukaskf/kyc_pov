# Fireworks KYC PoV

![CleanShot 2024-12-18 at 18 03 48@2x](https://github.com/user-attachments/assets/9db90b54-52fb-4ea0-8192-9405bea7e207)


![CleanShot 2024-12-18 at 18 04 01@2x](https://github.com/user-attachments/assets/62fc9c54-1be2-4ae4-9a9c-ece4e22fe439)

## Demo

You can test this live at [withwell.com/fireworks](https://withwell.com/fireworks)

## Frontend
Built with React, Next.js, Tailwind, and Shadcn. Deployed on Vercel. 

The front end allow users to upload multiples images or selected from sample images to extract revelant information for KYC. The user can then review the extracted information.

## Backend
Built with Python, Flask, Pydantic, and Fireworks API through the Openai SDK. Deployed on Railway.

The backend is a simple Flask server that first optimizes the image size and base64 encodes it. It then sends the image to llama-90b-vision-instruct via the Fireworks API. I use a system prompt in combination with Pydantic to get structured fields returned from the image.

## Improvements and Implementation Notes
Right now the extraction schema is hard coded in API with pydantic. Although you could allow an interface to change the schema. If a customer decided they needed specific fields it would be easy to adjust the schema. 

Additionally you could allow a user to review the information extracted and send back for re-extraction in the api. 

Lastly, using an OCR model, like AWS textract, before passing to the LLM would greatly improve accuracy and performance. It ensures a higher accuracy of text extraction, and then the LLM can be used structure the fields and return a more friendly output. (this is what we do at Well under the hood)

I chose llama-90b-vision-instruct because it's a large multimodal model with good performance and it is very easy to use. Next.js is an easy way to build webapp, and python is a first class language for image manipulation and LLM tools like pydantic. 

I'm also not running any evals for testing. You would want to run some tests to ensure the model is working reliably and accurately.
