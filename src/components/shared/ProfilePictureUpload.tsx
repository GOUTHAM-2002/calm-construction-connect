import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface ProfilePictureUploadProps {
  onImageSelect: (file: File | null) => void;
  onImagePreview: (url: string | null) => void;
  uploadedAvatarUrl: string | null;
  isUploading: boolean;
  setUploadedAvatarUrl: (url: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function ProfilePictureUpload({
  onImageSelect,
  onImagePreview,
  uploadedAvatarUrl,
  isUploading,
  setUploadedAvatarUrl,
  disabled = false,
  className = "",
}: ProfilePictureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      onImageSelect(file);
      onImagePreview(URL.createObjectURL(file));

      // Upload image immediately
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        setUploadedAvatarUrl(urlData?.publicUrl);
        toast.success("Profile picture uploaded successfully!");
      } catch (error: any) {
        console.error("Error uploading avatar:", error);
        toast.error(`Failed to upload profile picture: ${error.message}`);
        setUploadedAvatarUrl(null);
      }
    }
  };

  const handleRemoveImage = () => {
    onImageSelect(null);
    onImagePreview(null);
    setUploadedAvatarUrl(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Profile Picture Display */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="h-32 w-32">
            <AvatarImage
              src={uploadedAvatarUrl || undefined}
              alt="Profile picture"
            />
            <AvatarFallback className="text-lg">
              <Camera className="h-16 w-16" />
            </AvatarFallback>
          </Avatar>

          {/* Remove button */}
          {uploadedAvatarUrl && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemoveImage}
              disabled={disabled || isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex flex-col items-center space-y-2">
          <Button
            variant="outline"
            onClick={handleUploadClick}
            disabled={disabled || isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading
              ? "Uploading..."
              : uploadedAvatarUrl
              ? "✓ Uploaded - Change Photo"
              : "Upload Photo"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Click to upload a profile picture. Supported formats: JPG, PNG, GIF
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
