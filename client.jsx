import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Upload, AlertCircle, ExternalLink, RotateCw } from "lucide-react";
import axios from "axios";
import { pyApiBaseUrl } from "@/util/routes";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FileUpload = ({ files, setFiles }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const removeFile = (index) => {
        setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Processing</CardTitle>
            </CardHeader>
            <CardContent>
                {files.length === 0 && (
                    <div className="flex items-center justify-center">
                        <p className="text-gray-500">No Files Processing</p>
                    </div>
                )}
                {files.length > 0 && (
                    <Table className="mt-6">
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>{"    "}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {files.map((file, index) => (
                                <TableRow
                                    key={index}
                                    className={
                                        file.status === "ready"
                                            ? "cursor-pointer hover:bg-gray-50"
                                            : ""
                                    }
                                    onClick={() => file.status === "ready" && setSelectedFile(file)}
                                >
                                    <TableCell>{file.name}</TableCell>
                                    <TableCell>{file.type}</TableCell>
                                    <TableCell>{(file.size / 1024).toFixed(2)} KB</TableCell>
                                    <TableCell>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                file.status === "ready"
                                                    ? "bg-green-100 text-green-800"
                                                    : file.status === "processing"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-red-100 text-red-800"
                                            }`}
                                        >
                                            {file.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {file.status === "error" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFile(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {file.status === "ready" && (
                                            <ExternalLink className="h-4 w-4 text-gray-500" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                <FileModal
                    file={selectedFile}
                    isOpen={!!selectedFile}
                    onClose={() => setSelectedFile(null)}
                />
            </CardContent>
        </Card>
    );
};

const FileModal = ({ file, isOpen, onClose }) => {
    const [rotation, setRotation] = useState(0);

    const formatFieldName = (field) => {
        return field
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    if (!file) return null;

    const parsedResponse =
        typeof file.response === "string" ? JSON.parse(file.response) : file.response;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        {file.name}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                    <div className="flex flex-col h-full">
                        <div className="relative aspect-[3/2] flex-shrink-0">
                            <Image
                                src={URL.createObjectURL(file.file)}
                                alt={file.name}
                                layout="fill"
                                className="object-contain transition-transform duration-200"
                                style={{ transform: `rotate(${rotation}deg)` }}
                            />
                        </div>
                        <div className="mt-2">
                            <Button variant="outline" size="sm" onClick={handleRotate}>
                                <RotateCw className="h-4 w-4 mr-1" />
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-auto min-h-0">
                        <Table>
                            <TableBody>
                                {parsedResponse &&
                                    Object.entries(parsedResponse).map(([key, value]) => (
                                        <TableRow key={key}>
                                            <TableCell className="font-medium text-gray-500 font-mono w-1/3">
                                                {formatFieldName(key)}
                                            </TableCell>
                                            <TableCell className="w-2/3">{value}</TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function UploadPage({}) {
    const [files, setFiles] = useState([]);

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post(pyApiBaseUrl + "/fireworks", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                },
                withCredentials: true
            });

            if (response.status !== 200) {
                throw new Error("Upload failed");
            }

            return {
                status: "ready",
                data: response.data.response
            };
        } catch (error) {
            console.error("Upload error:", error);
            return { status: "error", data: null };
        }
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const newFiles = acceptedFiles.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            status: "processing",
            file: file,
            response: null
        }));

        setFiles((prevFiles) => [...prevFiles, ...newFiles]);

        for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i];
            const result = await uploadFile(file.file);
            setFiles((prevFiles) =>
                prevFiles.map((f) =>
                    f === file ? { ...f, status: result.status, response: result.data } : f
                )
            );
        }
    }, []);

    const handleSampleImageUpload = async (imagePath) => {
        try {
            const response = await fetch(imagePath);
            const blob = await response.blob();
            const file = new File([blob], imagePath.split("/").pop(), { type: blob.type });
            onDrop([file]);
        } catch (error) {
            console.error("Error loading sample image:", error);
        }
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        noClick: true
    });

    const sampleImages = [
        "/passport-1.jpeg",
        "/License-2.jpg",
        "/License-3.jpeg",
        "/License-1.png",
        "/passport-2.jpg"
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto py-10">
                <Breadcrumb className="px-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage>Fireworks.ai</BreadcrumbPage>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>KYC PoV</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="mb-8">
                    <div className="container mx-auto p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex flex-col sm:w-1/2">
                                <Card className="mb-8 h-full">
                                    <CardHeader>
                                        <CardTitle>Upload Documents</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center space-x-2 text-gray-600 mb-4">
                                            <AlertCircle className="flex-shrink-0" />
                                            <p>
                                                Include personal documents such as passports and
                                                driver&apos;s licenses
                                            </p>
                                        </div>
                                        <div
                                            {...getRootProps()}
                                            className="border-2 border-dashed border-gray-100 rounded-lg p-8 text-center bg-white hover:border-gray-400 transition-colors"
                                        >
                                            <input {...getInputProps()} />
                                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                            <div className="flex flex-col items-center justify-center">
                                                <p className="text-lg text-gray-600 mb-4">
                                                    Drag & drop files here, or
                                                </p>
                                                <Button
                                                    onClick={open}
                                                    className="bg-primary hover:bg-primary-dark"
                                                >
                                                    Select Files
                                                </Button>
                                            </div>
                                            <div className="mt-4">
                                                <p className="font-semibold text-gray-500 mb-2 text-sm">
                                                    Accepted File Types:
                                                </p>
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {["JPG", "JPEG", "PNG"].map((type) => (
                                                        <span
                                                            key={type}
                                                            className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600"
                                                        >
                                                            {type}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex flex-col sm:w-1/2">
                                <Card className="mb-8 h-full">
                                    <CardHeader>
                                        <CardTitle>Sample</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4 w-full h-full">
                                            {sampleImages.map((imagePath) => (
                                                <div
                                                    key={imagePath}
                                                    className="relative cursor-pointer aspect-[3/2] bg-gray-50 rounded-lg overflow-hidden hover:bg-gray-100 transition-colors"
                                                    onClick={() =>
                                                        handleSampleImageUpload(imagePath)
                                                    }
                                                >
                                                    <Image
                                                        src={imagePath}
                                                        layout="fill"
                                                        className="object-contain p-2"
                                                        alt={`Sample ${imagePath.split("/").pop()}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <FileUpload files={files} setFiles={setFiles} uploadFile={uploadFile} />

                        {isDragActive && (
                            <div className="fixed inset-0 bg-primary/10 flex items-center justify-center z-50 pointer-events-none">
                                <p className="text-2xl font-semibold text-primary">
                                    Drop files here ...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}