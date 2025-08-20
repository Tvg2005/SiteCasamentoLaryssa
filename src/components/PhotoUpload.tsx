import React, { useState, useCallback } from 'react';
import { Upload, User, Camera, CheckCircle, AlertCircle, X } from 'lucide-react';

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

interface PhotoUploadProps {
  onUploadSuccess: () => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onUploadSuccess }) => {
  const [userName, setUserName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    addFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleUpload = async () => {
    if (!userName.trim()) {
      alert('Por favor, digite seu nome antes de enviar as fotos.');
      return;
    }

    if (uploadedFiles.length === 0) {
      alert('Por favor, selecione pelo menos uma foto para enviar.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('userName', userName);
      
      uploadedFiles.forEach((fileData, index) => {
        formData.append(`photos`, fileData.file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Upload bem-sucedido:', result);
      
      setUploadStatus('success');
      setErrorMessage('');
      onUploadSuccess();
      
      // Limpar após sucesso
      setTimeout(() => {
        setUploadedFiles([]);
        setUserName('');
        setUploadStatus('idle');
        setErrorMessage('');
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido no upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-olive-100 overflow-hidden">
      <div className="bg-gradient-to-r from-olive-600 to-olive-700 p-6">
        <div className="flex items-center gap-3">
          <Camera className="w-8 h-8 text-white" />
          <h2 className="text-2xl font-serif text-white">
            Enviar Suas Fotos
          </h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Nome do usuário */}
        <div>
          <label className="flex items-center gap-2 text-olive-700 font-medium mb-2">
            <User className="w-5 h-5" />
            Seu Nome
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Digite seu nome completo"
            className="w-full px-4 py-3 border border-olive-200 rounded-xl focus:ring-2 
                     focus:ring-olive-400 focus:border-olive-400 outline-none transition-all
                     bg-white/50 backdrop-blur-sm"
          />
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
            ${isDragging 
              ? 'border-olive-400 bg-olive-50/80 scale-105' 
              : 'border-olive-200 bg-white/30 hover:bg-olive-50/50'
            }`}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="photo-upload"
          />
          
          <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors
            ${isDragging ? 'text-olive-600' : 'text-olive-400'}`} />
          
          <p className="text-olive-700 mb-2 font-medium">
            {isDragging ? 'Solte as fotos aqui!' : 'Arraste suas fotos aqui'}
          </p>
          
          <p className="text-olive-600 text-sm mb-4">
            ou
          </p>
          
          <label
            htmlFor="photo-upload"
            className="bg-olive-600 hover:bg-olive-700 text-white px-6 py-3 rounded-full 
                     cursor-pointer transition-all duration-300 transform hover:scale-105
                     shadow-lg hover:shadow-xl inline-flex items-center gap-2 font-medium"
          >
            <Camera className="w-5 h-5" />
            Selecionar Fotos
          </label>
          
          <p className="text-olive-500 text-sm mt-4">
            Formatos suportados: JPG, PNG, GIF • Sem limite de quantidade
          </p>
        </div>

        {/* Preview das fotos */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-olive-700 font-semibold flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Fotos Selecionadas ({uploadedFiles.length})
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {uploadedFiles.map((fileData) => (
                <div key={fileData.id} className="relative group">
                  <img
                    src={fileData.preview}
                    alt="Preview"
                    className="w-full h-24 object-cover rounded-xl shadow-md 
                             group-hover:shadow-lg transition-all duration-300"
                  />
                  <button
                    onClick={() => removeFile(fileData.id)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 
                             text-white rounded-full p-1 opacity-0 group-hover:opacity-100 
                             transition-all duration-200 shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão de envio */}
        <div className="flex flex-col items-center gap-4">
          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Fotos enviadas com sucesso!</span>
            </div>
          )}
          
          {uploadStatus === 'error' && (
            <div className="flex flex-col items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl max-w-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Erro ao enviar</span>
              </div>
              {errorMessage && (
                <p className="text-sm text-red-500 text-center">{errorMessage}</p>
              )}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading || uploadedFiles.length === 0 || !userName.trim()}
            className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300
              transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-3
              ${isUploading || uploadedFiles.length === 0 || !userName.trim()
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-olive-600 to-olive-700 hover:from-olive-700 hover:to-olive-800 text-white'
              }`}
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                Enviar {uploadedFiles.length} foto{uploadedFiles.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;