import React from 'react';
import { CheckCircle, Heart, ExternalLink, X } from 'lucide-react';

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThankYouModal: React.FC<ThankYouModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleViewPhotos = () => {
    window.open('https://drive.google.com/drive/folders/1IAvKY8c4Scwt1TOpDhfKOErEw4nKpfsw?usp=sharing', '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-olive-600 to-olive-700 p-6 text-white text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-200" />
          <h2 className="text-2xl font-serif mb-2">Obrigado!</h2>
          <p className="text-olive-100 text-sm">
            Suas fotos foram enviadas com sucesso
          </p>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="mb-6">
            <Heart className="w-12 h-12 text-olive-600 mx-auto mb-3 animate-pulse" />
            <h3 className="text-olive-800 font-semibold text-lg mb-2">
              Suas memórias foram salvas!
            </h3>
            <p className="text-olive-700 leading-relaxed">
              Suas fotos já estão disponíveis no nosso álbum compartilhado. 
              Obrigado por nos ajudar a eternizar esses momentos especiais!
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleViewPhotos}
              className="w-full bg-olive-600 hover:bg-olive-700 text-white px-6 py-3 
                       rounded-full font-medium transition-all duration-300 transform 
                       hover:scale-105 shadow-lg hover:shadow-xl flex items-center 
                       justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Ver todas as fotos
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-olive-100 hover:bg-olive-200 text-olive-700 px-6 py-3 
                       rounded-full font-medium transition-all duration-300"
            >
              Continuar navegando
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full 
                   transition-colors text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ThankYouModal;