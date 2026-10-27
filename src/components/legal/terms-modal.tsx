"use client";

import { useEffect } from "react";
import { TermsContent } from "./terms-content";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Termos de Uso e Contrato SaaS</h2>
            <p className="text-xs text-gray-500">Leia com atenção os termos da nossa plataforma</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto flex-1">
          <TermsContent />
        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href="/termos-de-uso"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline font-medium"
          >
            Abrir em uma nova aba &nearr;
          </a>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Fechar
            </button>
            {onAccept && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="flex-1 sm:flex-initial px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
              >
                Concordar e Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
