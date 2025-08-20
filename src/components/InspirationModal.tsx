import React from 'react';
import { X, ImageIcon } from 'lucide-react';

interface InspirationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InspirationModal: React.FC<InspirationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-olive-600 to-olive-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-serif">Mural de Inspiração</h2>
                <p className="text-olive-100 text-sm">
                  Inspire-se com nosso mural especial
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="text-center mb-6">
            <p className="text-olive-700 leading-relaxed max-w-2xl mx-auto mb-6">
              Este é nosso mural de inspiração! Use-o como referência para capturar 
              momentos especiais durante nossa celebração.
            </p>
          </div>
          
          {/* Image Container */}
          <div className="flex justify-center">
            <div className="relative group">
              <img 
                src="/image.png" 
                alt="Mural de Inspiração" 
                className="max-w-full h-auto rounded-xl shadow-2xl border-4 border-olive-100 
                         hover:border-olive-200 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 
                            rounded-xl transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                    <ImageIcon className="w-8 h-8 text-olive-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer message */}
          <div className="mt-8 p-6 bg-gradient-to-r from-olive-100 to-amber-100 rounded-xl border border-olive-200">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-olive-600 mx-auto mb-3" />
              <h4 className="text-olive-800 font-semibold text-lg mb-2">
                Inspire-se e capture!
              </h4>
              <p className="text-olive-700 leading-relaxed max-w-2xl mx-auto">
                Use este mural como inspiração para suas fotos. Cada ângulo, cada 
                momento pode se tornar uma memória preciosa do nosso dia especial!
              </p>
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="bg-olive-600 hover:bg-olive-700 text-white px-8 py-3 rounded-full 
                       font-medium transition-all duration-300 transform hover:scale-105
                       shadow-lg hover:shadow-xl"
            >
              Entendi, vou me inspirar!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspirationModal;
