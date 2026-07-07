import { useState, useRef, useCallback, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { AxiosProgressEvent } from "axios";

interface UploadMetadata {
  category: string;
  classification: string;
  tags: string[];
}

/**
 * Hook to manage document uploads for RAG
 */
export const useRAG = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [uploadMetadata, setUploadMetadata] = useState<UploadMetadata>({
    category: "general",
    classification: "Internal",
    tags: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      const validFiles = files.filter((file) => {
        const isValidType =
          file.type === "application/pdf" ||
          file.type === "text/plain" ||
          file.type === "text/csv" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.name.endsWith(".txt") ||
          file.name.endsWith(".pdf") ||
          file.name.endsWith(".docx") ||
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".csv");
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
        return isValidType && isValidSize;
      });

      if (files.length > validFiles.length) {
        setUploadError(
          "Beberapa file tidak valid (hanya PDF/TXT/DOCX/XLSX/CSV dan maksimal 10MB)",
        );
      } else {
        setUploadError("");
      }

      setUploadedFiles((prev) => [...prev, ...validFiles]);

      if (validFiles.length > 0) {
        // Files are now queued in uploadedFiles state.
        // They will be explicitly uploaded when the user clicks Send.
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addTag = useCallback(
    (tag: string) => {
      if (tag.trim() && !uploadMetadata.tags.includes(tag)) {
        setUploadMetadata((prev) => ({
          ...prev,
          tags: [...prev.tags, tag.trim()],
        }));
      }
    },
    [uploadMetadata.tags],
  );

  const removeTag = useCallback((tagToRemove: string) => {
    setUploadMetadata((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  }, []);

  const uploadDocuments = async (files?: File[]): Promise<boolean> => {
    const filesToUpload = files || uploadedFiles;
    if (filesToUpload.length === 0) {
      setUploadError("Pilih minimal satu file untuk diupload");
      return false;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");
    setUploadProgress(10);

    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append("files", file);
      });

      formData.append(
        "metadata",
        JSON.stringify({
          ...uploadMetadata,
          language: "indonesian",
        }),
      );

      // Using apiClient (Axios) for better progress tracking if needed,
      // but here we just simulate for now based on the original logic
      const response = await apiClient.post("/api/rag/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percentCompleted);
          }
        },
      });

      if (response.data.success) {
        const count =
          response.data.data.queued ||
          response.data.data.successful ||
          uploadedFiles.length;
        const successMsg = `${count} file berhasil diupload dan sedang diproses di latar belakang!`;
        setUploadSuccess(successMsg);
        setShowUploadSuccess(true);

        // Reset state after success
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setShowUploadModal(false);
          // setUploadedFiles([]); // We preserve the files until user clicks send
          setUploadMetadata({
            category: "general",
            classification: "Internal",
            tags: [],
          });
          setUploadSuccess("");
          setShowUploadSuccess(false);
        }, 2000);
        return true;
      } else {
        throw new Error(response.data.error || "Upload gagal");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(
        err.response?.data?.error || err.message || "Upload gagal",
      );
      return false;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    uploadedFiles,
    isUploading,
    uploadProgress,
    uploadError,
    uploadSuccess,
    showUploadSuccess,
    showUploadModal,
    setShowUploadModal,
    uploadMetadata,
    setUploadMetadata,
    fileInputRef,
    handleFileSelect,
    removeFile,
    addTag,
    removeTag,
    uploadDocuments,
    setUploadedFiles,
  };
};
