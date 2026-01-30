import React, { useState } from 'react';
import PebbleProof from './PebbleProof';
import WaterProof from './WaterProof';
import DissectionProof from './DissectionProof';
import { emitEvent } from '../../../utils/eventEmitter';
import type { PythagoreanTheoremProofsProps } from './types';

const PythagoreanTheoremProofs: React.FC<PythagoreanTheoremProofsProps> = ({ questId, interaction }) => {
  // Determine which proof to show based on questId
  const getProofType = (id: string): number => {
    switch (id) {
      case 'pebble': return 1;
      case 'pouring': return 2;
      case 'dissection': return 3;
      default: return 1;
    }
  };

  const currentProof = getProofType(questId);

  // Proof 1 states (Pebble Proof)
  const [proof1A, setProof1A] = useState<number>(3);
  const [proof1B, setProof1B] = useState<number>(4);
  const [proof1C, setProof1C] = useState<number>(5);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [hasAnimatedProof, setHasAnimatedProof] = useState<boolean>(false);
  const [hasSelectedDifferentTriple, setHasSelectedDifferentTriple] = useState<boolean>(false);

  // Proof 2 states (Water Proof)
  const [proof2A, setProof2A] = useState<number>(3);
  const [proof2B, setProof2B] = useState<number>(4);
  const [pouredA, setPouredA] = useState<boolean>(false);
  const [pouredB, setPouredB] = useState<boolean>(false);
  const [pouredBFirst, setPouredBFirst] = useState<boolean>(false);

  // Proof 3 states (Dissection Proof)
  const [proof3A, setProof3A] = useState<number>(100);
  const [proof3B, setProof3B] = useState<number>(150);

  // Current values based on active proof
  const currentA = currentProof === 1 ? proof1A : currentProof === 2 ? proof2A : proof3A;
  const currentB = currentProof === 1 ? proof1B : currentProof === 2 ? proof2B : proof3B;

  const { translations: _translations } = interaction;

  const handleTripleSelect = (a: number, b: number) => {
    const c = Math.round(Math.sqrt(a * a + b * b));

    // Check if this is a different triple than the default (3,4,5)
    if (currentProof === 1 && (a !== 3 || b !== 4) && (proof1A === 3 && proof1B === 4)) {
      setHasSelectedDifferentTriple(true);
    }

    if (currentProof === 1) {
      setProof1A(a);
      setProof1B(b);
      setProof1C(c);
    } else {
      setProof2A(a);
      setProof2B(b);
    }
    setIsAnimating(false);
    setHasAnimatedProof(false);
  };

  const handleAnimate = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setHasAnimatedProof(true);
      
      // Emit event if user has selected a different triple and is now animating
      if (currentProof === 1 && hasSelectedDifferentTriple) {
        emitEvent('pebble_proof_try_different_triple', { 
          triple: `${proof1A}-${proof1B}-${proof1C}`,
          previousTriple: '3-4-5'
        });
      }
      
      // Animation logic would be handled by PebbleProof component
    }
  };

  const handleReset = () => {
    setIsAnimating(false);
    setHasAnimatedProof(false);
    setPouredA(false);
    setPouredB(false);
    setPouredBFirst(false);
  };

  const handlePour = (source: 'a' | 'b') => {
    if (!pouredA && !pouredB) {
        if (source === 'b') {
            setPouredBFirst(true);
        }
    }
    if (source === 'a') {
      setPouredA(true);
    } else {
      setPouredB(true);
    }
    
    // Check if both have been poured and emit event
    const willBothBePoured = source === 'a' ? !pouredB : !pouredA;
    const otherAlreadyPoured = source === 'a' ? pouredB : pouredA;
    
    if (otherAlreadyPoured || (willBothBePoured && (source === 'b' ? pouredA : pouredB))) {
      // This will be the action that completes both pours
      setTimeout(() => {
        emitEvent('water_proof_pour_both_squares', { 
          aSquared: proof2A * proof2A,
          bSquared: proof2B * proof2B,
          cSquared: (proof2A * proof2A) + (proof2B * proof2B)
        });
      }, 100); // Small delay to ensure state has updated
    }
  };

  const handleSliderChange = (type: 'a' | 'b', value: string) => {
    const newValue = parseInt(value);
    const otherValue = type === 'a' ? currentB : currentA;
    const newC = Math.round(Math.sqrt(newValue * newValue + otherValue * otherValue));

    if (currentProof === 1) {
      if (type === 'a') {
        setProof1A(newValue);
      } else {
        setProof1B(newValue);
      }
      setProof1C(newC);
    } else if (currentProof === 2) {
      if (type === 'a') {
        setProof2A(newValue);
      } else {
        setProof2B(newValue);
      }
    } else if (currentProof === 3) {
      if (type === 'a') {
        setProof3A(newValue);
      } else {
        setProof3B(newValue);
      }
    }
  };

  const handleRearrange = () => {
    // Rearrange logic handled by DissectionProof component
  };

  return (
    <div className="w-full h-full text-lg flex flex-col gap-y-6">
      {currentProof === 1 && (
        <PebbleProof
          translations={_translations.pebbleProof}
          currentA={proof1A}
          currentB={proof1B}
          currentC={proof1C}
          onTripleSelect={handleTripleSelect}
          onAnimate={handleAnimate}
          onReset={handleReset}
          isAnimating={isAnimating}
          hasAnimatedProof={hasAnimatedProof}
        />
      )}

      {currentProof === 2 && (
        <WaterProof
          translations={_translations.waterProof}
          currentA={proof2A}
          currentB={proof2B}
          onSliderChange={handleSliderChange}
          onPour={handlePour}
          onReset={handleReset}
          pouredA={pouredA}
          pouredB={pouredB}
          pouredBFirst={pouredBFirst}
        />
      )}

      {currentProof === 3 && (
        <DissectionProof
          translations={_translations.dissectionProof}
          currentA={proof3A}
          currentB={proof3B}
          onSliderChange={handleSliderChange}
          onRearrange={handleRearrange}
        />
      )}
    </div>
  );
};

export default PythagoreanTheoremProofs;
