"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface ImageCropModalProps {
  imageFile: File;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export function ImageCropModal({
  imageFile,
  onCropComplete,
  onCancel,
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  
  // Crop transforms: offset X and Y (in px of viewport) and zoom scale
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Carrega a imagem a partir do arquivo
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Drag handlers (Mouse & Touch)
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Gera o corte 1:1 de alta resolução usando Canvas
  const handleConfirmCrop = useCallback(() => {
    if (!imgRef.current || !containerRef.current || !naturalSize) return;

    const img = imgRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Dimensão final do quadrado desejado (máximo 1200px para qualidade ótima sem pesar)
    const OUTPUT_SIZE = Math.min(1200, Math.max(naturalSize.width, naturalSize.height));

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Calcular a posição e escala relativas da imagem renderizada
    const renderedWidth = img.width;
    const renderedHeight = img.height;

    // Relação entre os pixels naturais da foto e os pixels exibidos na tela
    const scaleFactor = naturalSize.width / renderedWidth;

    // O centro do container do corte relativo à imagem renderizada
    // O container é um quadrado no centro.
    const cropBoxSize = containerRect.width;

    // Ponto superior esquerdo do recorte em relação à imagem renderizada
    const cropXOnRendered = (renderedWidth - cropBoxSize) / 2 - offset.x;
    const cropYOnRendered = (renderedHeight - cropBoxSize) / 2 - offset.y;

    // Converte para coordenadas da imagem original (natural)
    const sourceX = cropXOnRendered * scaleFactor;
    const sourceY = cropYOnRendered * scaleFactor;
    const sourceSize = cropBoxSize * scaleFactor;

    // Desenha no canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      imageFile.type === "image/png" ? "image/png" : "image/jpeg",
      0.92
    );
  }, [offset, naturalSize, imageFile, onCropComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Ajustar Foto do Produto
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Arraste e ajuste o zoom para o enquadramento perfeito (1:1).
            </p>
          </div>
          <button
            onClick={onCancel}
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            ✕
          </button>
        </div>

        {/* Viewport / Crop Area */}
        <div className="relative bg-gray-950 flex items-center justify-center p-4 select-none touch-none overflow-hidden">
          {/* Container do Recorte (Quadrado) */}
          <div
            ref={containerRef}
            className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden shadow-inner border-2 border-dashed border-white/60 flex items-center justify-center cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 1) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={handlePointerUp}
          >
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Enquadramento"
                onLoad={handleImageLoad}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  maxHeight: "none",
                  maxWidth: "none",
                  width: naturalSize && naturalSize.width < naturalSize.height ? "100%" : "auto",
                  height: naturalSize && naturalSize.width >= naturalSize.height ? "100%" : "auto",
                  minWidth: "100%",
                  minHeight: "100%",
                  objectFit: "cover",
                }}
                className="pointer-events-none select-none transition-transform duration-75"
                draggable={false}
              />
            )}

            {/* Grid guia (regra dos terços) */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>
          </div>
        </div>

        {/* Controles de Zoom */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium">Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[var(--color-primary)] cursor-pointer h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none"
            />
            <span className="text-xs font-mono text-gray-600 dark:text-gray-300 w-8 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Dica: Fotos do Instagram ou Stories podem ser reposicionadas livremente.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2 bg-white dark:bg-gray-900">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCrop}
            className="bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            Confirmar Enquadramento
          </Button>
        </div>
      </div>
    </div>
  );
}
