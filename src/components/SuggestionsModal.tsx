import React from 'react';
import { X, Camera, Sparkles, Music, Wine, Users, Sunset } from 'lucide-react';

interface SuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const suggestions = [
  {
    icon: Camera,
    title: '📸 Momentos com os noivos',
    items: [
      'Foto abraçando os noivos.',
      'Beijo dos noivos visto de um ângulo criativo (por trás, em silhueta, etc.).',
      'Reação dos convidados na hora do beijo ou da entrada.'
    ]
  },
  {
    icon: Sparkles,
    title: '🎉 Momentos espontâneos',
    items: [
      'Risadas na pista de dança.',
      'Brinde coletivo levantando as taças.',
      'Crianças se divertindo (dançando, correndo).',
      'Conversas animadas nas mesas.'
    ]
  },
  {
    icon: Music,
    title: '💃 Pista de dança',
    items: [
      'Foto em grupo dançando.',
      'Selfie com várias pessoas juntas.',
      'Fotos engraçadas com coreografias.'
    ]
  },
  {
    icon: Wine,
    title: '🍷 Detalhes',
    items: [
      'Decoração das mesas.',
      'Bolo, doces ou drinks bonitos.',
      'Buquê, alianças ou lembrancinhas.'
    ]
  },
  {
    icon: Users,
    title: '🥂 Amigos e família',
    items: [
      'Foto com os pais dos noivos.',
      'Grupo de amigos posando juntos.',
      'Retrato espontâneo de casais convidados.'
    ]
  },
  {
    icon: Sunset,
    title: '🌅 Ambiente',
    items: [
      'Vista do local (ex.: pôr do sol, iluminação da festa).',
      'Fachada ou entrada decorada.',
      'Detalhes de flores, luzes ou velas.'
    ]
  }
];

const SuggestionsModal: React.FC<SuggestionsModalProps> = ({ isOpen, onClose }) => {
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
              <Camera className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-serif">Sugestões de Fotos</h2>
                <p className="text-olive-100 text-sm">
                  Ideias para capturar os melhores momentos
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
          <div className="grid gap-6 md:grid-cols-2">
            {suggestions.map((category, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-olive-50 to-amber-50 border border-olive-100 
                         rounded-xl p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-olive-600 p-2 rounded-lg">
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-olive-800">
                    {category.title}
                  </h3>
                </div>
                
                <ul className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex items-start gap-3 text-olive-700"
                    >
                      <div className="w-2 h-2 bg-olive-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="leading-relaxed text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer message */}
          <div className="mt-8 p-6 bg-gradient-to-r from-olive-100 to-amber-100 rounded-xl border border-olive-200">
            <div className="text-center">
              <Camera className="w-12 h-12 text-olive-600 mx-auto mb-3" />
              <h4 className="text-olive-800 font-semibold text-lg mb-2">
                Seja criativo!
              </h4>
              <p className="text-olive-700 leading-relaxed max-w-2xl mx-auto">
                Estas são apenas sugestões para te inspirar. O mais importante é 
                capturar os momentos que tocaram seu coração. Cada foto sua ajuda 
                a contar a história do nosso dia especial!
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
              Entendi, vou fotografar!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestionsModal;