import React, { useState } from 'react';
import { Camera, Heart, Upload, Lightbulb, X, ImageIcon, Images, GalleryVerticalEnd} from 'lucide-react';
import PhotoUpload from './components/PhotoUpload';
import SuggestionsModal from './components/SuggestionsModal';
import ThankYouModal from './components/ThankYouModal';
import InspirationModal from './components/InspirationModal';

function App() {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showInspiration, setShowInspiration] = useState(false);

  const handleUploadSuccess = () => {
    setShowThankYou(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-6 h-6 text-olive-600 animate-pulse" />
              <h1 className="text-2xl md:text-4xl font-serif text-olive-800">
                Laryssa & Rafael
              </h1>
              <Heart className="w-6 h-6 text-olive-600 animate-pulse" />
            </div>
            <p className="text-olive-600 text-sm md:text-base font-light tracking-wide">
              Compartilhe os momentos mágicos do nosso dia especial
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome Section */}
        <section className="text-center mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-olive-100">
            <Camera className="w-16 h-16 text-olive-600 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-serif text-olive-800 mb-4">
              Capture Nossos Momentos
            </h2>
            <p className="text-olive-700 leading-relaxed mb-6 max-w-2xl mx-auto">
              Queridos convidados, vocês são parte fundamental da nossa história! 
              Compartilhem suas fotos e ajudem a eternizar cada sorriso, cada abraço 
              e cada momento especial do nosso casamento.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <button
                onClick={() => setShowSuggestions(true)}
                className="bg-olive-600 hover:bg-olive-700 text-white px-6 py-3 rounded-full 
                         font-medium transition-all duration-300 transform hover:scale-105 
                         shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Lightbulb className="w-5 h-5" />
                Ver Sugestões de Fotos
              </button>
              
              <button
                onClick={() => setShowInspiration(true)}
                className="bg-white hover:bg-olive-50 text-olive-600 border-2 border-olive-600 
                         hover:border-olive-700 px-6 py-3 rounded-full font-medium 
                         transition-all duration-300 transform hover:scale-105 shadow-lg 
                         hover:shadow-xl flex items-center gap-2"
              >
                <GalleryVerticalEnd className="w-5 h-5" />
                Mural de Inspiração
              </button>
              
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => window.open('https://drive.google.com/drive/folders/1Zs2LgeYcU3t4ztDglABV5EoL-vscMPxL?usp=sharing', '_blank')}
                className="bg-olive-100 hover:bg-olive-200 text-olive-700 px-4 py-2 rounded-full 
                         text-sm font-medium transition-all duration-300 flex items-center gap-2"
              >
                <Images className="w-4 h-4" />
                Ver todas as fotos enviadas
              </button>
            </div>
            
          </div>
        </section>

        {/* Photo Upload Section */}
        <section>
          <PhotoUpload onUploadSuccess={handleUploadSuccess} />
        </section>

        {/* Footer */}
        <footer className="text-center mt-16 py-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-olive-100">
            <Heart className="w-8 h-8 text-olive-600 mx-auto mb-2 animate-pulse" />
            <p className="text-olive-700 font-light">
              Obrigado por fazer parte do nosso dia especial!
            </p>
            <p className="text-olive-600 text-sm mt-2">
              Com amor, Laryssa & Rafael
            </p>
          </div>
        </footer>
      </main>

      {/* Suggestions Modal */}
      <SuggestionsModal 
        isOpen={showSuggestions} 
        onClose={() => setShowSuggestions(false)} 
      />
      
      {/* Thank You Modal */}
      <ThankYouModal 
        isOpen={showThankYou} 
        onClose={() => setShowThankYou(false)} 
      />
      
      {/* Inspiration Modal */}
      <InspirationModal 
        isOpen={showInspiration} 
        onClose={() => setShowInspiration(false)} 
      />
    </div>
  );
}

export default App;