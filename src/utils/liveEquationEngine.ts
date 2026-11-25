import { ExperimentConfig, LabMode, RigState } from '../types/lab';

export type EquationStage = 'ready' | 'mixing' | 'formed';

export interface LiveEquationState {
  stage: EquationStage;
  badge: string;
  equation: string;
  phenomenon: string;
  accentHex: string;
}

export function evaluateLiveEquation(
  exp: ExperimentConfig,
  state: RigState,
  labMode: LabMode
): LiveEquationState {
  const isExam = labMode === 'exam';

  if (exp.discipline === 'Chemistry') {
    return evaluateChemistryEquation(exp, state, isExam);
  }
  if (exp.discipline === 'Physics') {
    return evaluatePhysicsEquation(exp, state, isExam);
  }
  return evaluateBiologyEquation(exp, state);
}

function evaluateChemistryEquation(
  exp: ExperimentConfig,
  s: RigState,
  isExam: boolean
): LiveEquationState {
  switch (exp.subMode) {
    case 'ph_tile': {
      if (s.reagentAddedCount === 0) {
        return {
          stage: 'ready',
          badge: 'Solutions Ready',
          equation: 'HA(aq) + H₂O ⇌ H₃O⁺ + A⁻   |   pH = −log₁₀[H₃O⁺]',
          phenomenon: 'Dispense test drops onto the 6-well porcelain spotting tile.',
          accentHex: '#38bdf8',
        };
      }
      if (!s.litmusTested) {
        return {
          stage: 'mixing',
          badge: 'Sample Placed on Tile',
          equation: 'pH + pOH = 14   (298 K)   |   Ready for Universal Indicator',
          phenomenon: `${Math.min(6, s.reagentAddedCount * 2)} wells filled. Touch Universal pH strips to compare colors.`,
          accentHex: '#f59e0b',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · pH Spectrum',
        equation: 'HIn(red, pH 1–4) ⇌ H⁺ + In⁻(green pH 7 → violet pH 14)',
        phenomenon: 'HCl (pH 1.2 Red), NaOH (pH 13.4 Violet), CH₃COOH (pH 3.1 Orange), H₂O (pH 7.0 Green).',
        accentHex: '#10b981',
      };
    }

    case 'acid_base': {
      if (s.reagentAddedCount === 0 && !s.litmusTested && !s.splinterTested) {
        return {
          stage: 'ready',
          badge: 'Reactants Ready',
          equation: 'Zn(s) + HCl(aq) → ?   (Pour acid onto Zinc granules)',
          phenomenon: 'Pour Dil. HCl into the vessel to initiate single displacement & H₂ gas evolution.',
          accentHex: '#38bdf8',
        };
      }
      if (s.splinterTested) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Pop Test Confirmed',
          equation: 'Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂↑   |   2H₂(g) + O₂(g) → 2H₂O + Pop',
          phenomenon: 'Brisk H₂ effervescence ignited with a sharp acoustic pop; blue litmus turned red.',
          accentHex: '#10b981',
        };
      }
      if (s.reagentAddedCount >= 2) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Neutralization',
          equation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)   (ΔH = −57.1 kJ/mol)',
          phenomenon: 'Acid-base neutralization completed; pH shifted toward neutral.',
          accentHex: '#10b981',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Mixing Reactants · Gas Evolving',
        equation: 'Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g)↑',
        phenomenon: 'Hydrogen bubbles evolving vigorously. Test with litmus & burning splinter.',
        accentHex: '#f59e0b',
      };
    }

    case 'quicklime': {
      if (s.reagentAddedCount === 0) {
        return {
          stage: 'ready',
          badge: 'CaO Solid Ready',
          equation: 'CaO(s) + H₂O(l) → ?   (Add distilled water to Quicklime)',
          phenomenon: `Baseline temperature ${s.tempC.toFixed(1)} °C. Pour water to observe slaking.`,
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Exothermic Slaking',
        equation: 'CaO(s) + H₂O(l) → Ca(OH)₂(aq) + ΔH   (−63.7 kJ/mol)',
        phenomenon: `White milky slaked lime suspension formed with vigorous hissing (T = ${s.tempC.toFixed(1)} °C).`,
        accentHex: '#f97316',
      };
    }

    case 'thermal_decomp': {
      if (!s.solutionHeated && s.reagentAddedCount === 0) {
        return {
          stage: 'ready',
          badge: 'FeSO₄·7H₂O Ready',
          equation: '2FeSO₄(s) —(Δ Heat)→ ?   (Apply heat to pale-green crystals)',
          phenomenon: 'Light the heater to dehydrate and thermally decompose ferrous sulphate.',
          accentHex: '#38bdf8',
        };
      }
      if (!s.solutionHeated) {
        return {
          stage: 'mixing',
          badge: 'Dehydrating Crystals',
          equation: 'FeSO₄·7H₂O(green) —(Δ)→ FeSO₄(white) + 7H₂O↑',
          phenomenon: 'Water of crystallization driven off. Continue heating for oxide decomposition.',
          accentHex: '#f59e0b',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Thermal Decomposition',
        equation: '2FeSO₄(s) —(Δ)→ Fe₂O₃(s, Reddish-Brown) + SO₂(g)↑ + SO₃(g)↑',
        phenomenon: 'Reddish-brown ferric oxide residue left behind with pungent burning-sulphur SO₂/SO₃ gases.',
        accentHex: '#f97316',
      };
    }

    case 'displacement': {
      if (s.reagentAddedCount === 0 && !s.beakerStirred) {
        return {
          stage: 'ready',
          badge: 'Fe + CuSO₄(aq) Ready',
          equation: 'Fe(s) + CuSO₄(aq, Blue) → ?   (Immerse iron & mix)',
          phenomenon: 'Blue Cu²⁺ solution ready for redox displacement by Iron.',
          accentHex: '#38bdf8',
        };
      }
      if (s.reagentAddedCount > 0) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Redox Displacement',
          equation: 'Fe(s) + CuSO₄(aq, Blue) → FeSO₄(aq, Pale Green) + Cu(s, Red-Brown)↓',
          phenomenon: 'Cu²⁺ ions reduced to reddish-brown copper coating; solution shifted blue → pale green.',
          accentHex: '#10b981',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Electron Transfer Starting',
        equation: 'Fe → Fe²⁺ + 2e⁻   |   Cu²⁺ + 2e⁻ → Cu(s)',
        phenomenon: 'Add reagent / iron contact to complete the displacement reaction.',
        accentHex: '#f59e0b',
      };
    }

    case 'double_displacement': {
      if (s.reagentAddedCount === 0) {
        return {
          stage: 'ready',
          badge: 'Na₂SO₄(aq) Ready',
          equation: 'Na₂SO₄(aq) + BaCl₂(aq) → ?   (Pour BaCl₂ solution)',
          phenomenon: 'Clear sodium sulphate solution awaits barium chloride mixing.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Ion Exchange Precipitate',
        equation: 'Na₂SO₄(aq) + BaCl₂(aq) → BaSO₄(s, White ppt)↓ + 2NaCl(aq)',
        phenomenon: 'Dense insoluble white barium sulphate precipitate settled at the bottom of the beaker.',
        accentHex: '#10b981',
      };
    }

    case 'reactivity': {
      if (s.reagentAddedCount === 0) {
        return {
          stage: 'ready',
          badge: 'Metals Ready',
          equation: 'M(s) + Salt Solution → ?   (Mix to test Al, Zn, Fe, Cu)',
          phenomenon: 'Pour reagent to compare standard reduction potentials across metals.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Reactivity Order',
        equation: '2Al + 3ZnSO₄ → Al₂(SO₄)₃ + 3Zn   |   Order: Al > Zn > Fe > Cu',
        phenomenon: 'More electropositive metals displaced Cu²⁺ and Fe²⁺ ions from solution.',
        accentHex: '#10b981',
      };
    }

    case 'acetic_acid': {
      if (s.reagentAddedCount === 0 && !s.litmusTested) {
        return {
          stage: 'ready',
          badge: 'CH₃COOH Ready',
          equation: 'CH₃COOH(aq) + NaHCO₃(s) → ?   (Add NaHCO₃ / test litmus)',
          phenomenon: 'Glacial/dilute ethanoic acid in beaker; add sodium bicarbonate to test –COOH.',
          accentHex: '#38bdf8',
        };
      }
      if (s.reagentAddedCount > 0) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Carboxyl Effervescence',
          equation: 'CH₃COOH(aq) + NaHCO₃(s) → CH₃COONa(aq) + H₂O(l) + CO₂(g)↑',
          phenomenon: 'Brisk CO₂ effervescence observed; blue litmus turned red (weak organic acid).',
          accentHex: '#10b981',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Litmus Tested · Weak Acid',
        equation: 'CH₃COOH + H₂O ⇌ CH₃COO⁻ + H₃O⁺   (pKa = 4.76)',
        phenomenon: 'Blue litmus turned red. Add NaHCO₃ to evolve CO₂↑.',
        accentHex: '#f59e0b',
      };
    }

    case 'saponification': {
      if (s.reagentAddedCount === 0 && !s.solutionHeated && s.saltAddedG === 0) {
        return {
          stage: 'ready',
          badge: 'Vegetable Oil Ready',
          equation: 'Triglyceride + 3NaOH —(Δ)→ ?   (Add NaOH, heat & salt out)',
          phenomenon: 'Add concentrated NaOH alkali and warm to hydrolyze ester bonds.',
          accentHex: '#38bdf8',
        };
      }
      if (s.saltAddedG > 0 || (s.solutionHeated && s.beakerStirred)) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Soap Salted Out',
          equation: 'C₃H₅(OCOR)₃ + 3NaOH —(Δ, NaCl)→ C₃H₅(OH)₃ (Glycerol) + 3 RCOO⁻Na⁺ (Soap)↓',
          phenomenon: 'Common-ion salting out with NaCl precipitated solid sodium carboxylate soap curds.',
          accentHex: '#10b981',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Alkaline Hydrolysis in Progress',
        equation: 'RCOOR′ + NaOH → RCOONa + R′OH   (Emulsifying)',
        phenomenon: 'Stir, heat, and add NaCl salt to precipitate solid soap.',
        accentHex: '#f59e0b',
      };
    }

    case 'electrolysis': {
      if (!s.electrolysisCurrentOn && s.gasCollectedMl === 0) {
        return {
          stage: 'ready',
          badge: 'Voltameter Ready (6V DC)',
          equation: '2H₂O(l) —(DC Current)→ ?   (Switch ON 6V DC Battery)',
          phenomenon: 'Acidified water between inert electrodes awaiting DC potential.',
          accentHex: '#38bdf8',
        };
      }
      if (s.splinterTested || s.gasCollectedMl >= 8) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · 2:1 Gas Ratio',
          equation: 'Cathode: 4H⁺+4e⁻ → 2H₂↑ (2V)   |   Anode: 2H₂O → O₂↑+4H⁺+4e⁻ (1V)',
          phenomenon: `Net: 2H₂O → 2H₂↑ + O₂↑ (${s.gasCollectedMl.toFixed(1)} mL gas collected in 2:1 volume ratio).`,
          accentHex: '#10b981',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Electrolysis Running',
        equation: '2H₂O(l) —(e⁻)→ 2H₂(g)↑ + O₂(g)↑',
        phenomenon: `Bubbles evolving at both electrodes (${s.gasCollectedMl.toFixed(1)} mL collected).`,
        accentHex: '#f59e0b',
      };
    }

    case 'equilibrium': {
      if (s.reagentAddedCount === 0) {
        return {
          stage: 'ready',
          badge: 'Equilibrium Mixture',
          equation: 'Fe³⁺(yellow) + SCN⁻(colorless) ⇌ [Fe(SCN)]²⁺(blood red)',
          phenomenon: 'Add reagent (FeCl₃ / KSCN) to disturb equilibrium and observe Le Chatelier shift.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Forward Shift',
        equation: '[Fe(H₂O)₆]³⁺ + SCN⁻ ⇌ [Fe(H₂O)₅(SCN)]²⁺ (Deep Blood Red) + H₂O',
        phenomenon: 'Increased reactant concentration drove Qc < Kc, intensifying the blood-red complex.',
        accentHex: '#ef4444',
      };
    }

    case 'common_ion': {
      if (s.reagentAddedCount === 0 && s.saltAddedG === 0) {
        return {
          stage: 'ready',
          badge: 'Saturated NaCl(aq) Ready',
          equation: 'NaCl(s) ⇌ Na⁺(aq) + Cl⁻(aq)   (Ksp = [Na⁺][Cl⁻])',
          phenomenon: 'Add conc. HCl / excess Cl⁻ ions to exceed the solubility product Ksp.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Common-Ion Precipitation',
        equation: 'Na⁺(aq) + Cl⁻(excess HCl) → NaCl(s, White Crystals)↓   (Qsp > Ksp)',
        phenomenon: 'Elevated [Cl⁻] shifted equilibrium backward, precipitating pure crystalline NaCl.',
        accentHex: '#10b981',
      };
    }

    case 'titration_phenol': {
      if (!s.indicatorAdded && s.titratedMl === 0) {
        return {
          stage: 'ready',
          badge: 'Flask: H₂C₂O₄ · Burette: NaOH',
          equation: 'H₂C₂O₄(aq) + 2NaOH(aq) → ?   (Add Phenolphthalein & titrate)',
          phenomenon: 'Add 2 drops of phenolphthalein indicator to the oxalic acid flask.',
          accentHex: '#38bdf8',
        };
      }
      if (s.titratedMl >= 17.8) {
        return {
          stage: 'formed',
          badge: s.titratedMl > 19.6 ? 'Endpoint Overshot!' : 'Equation Formed · Faint Pink Endpoint',
          equation: 'H₂C₂O₄ + 2NaOH → Na₂C₂O₄ + 2H₂O   |   M₁V₁ / 1 = M₂V₂ / 2',
          phenomenon: isExam
            ? `Titrated ${s.titratedMl.toFixed(1)} mL NaOH — faint permanent pink endpoint observed.`
            : `V(NaOH) = ${s.titratedMl.toFixed(1)} mL → Faint pink phenolphthalein endpoint reached.`,
          accentHex: s.titratedMl > 19.6 ? '#f43f5e' : '#ec4899',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Titrating Dropwise',
        equation: `H₂C₂O₄ + 2NaOH → Na₂C₂O₄ + 2H₂O   (V = ${s.titratedMl.toFixed(1)} mL)`,
        phenomenon: 'Swirl flask continuously; solution remains colorless until equivalence point.',
        accentHex: '#f59e0b',
      };
    }

    case 'titration_kmno4_fas': {
      if (!s.pipetteAdded && s.titratedMl === 0) {
        return {
          stage: 'ready',
          badge: 'FAS + Dil. H₂SO₄ Ready',
          equation: '5Fe²⁺ + MnO₄⁻ + 8H⁺ → ?   (Add H₂SO₄ & titrate with KMnO₄)',
          phenomenon: 'KMnO₄ acts as a self-indicator in acidic medium.',
          accentHex: '#38bdf8',
        };
      }
      if (s.titratedMl >= 17.8) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Self-Indicator Endpoint',
          equation: 'MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺(colorless) + 5Fe³⁺ + 4H₂O',
          phenomenon: `Permanent pale-pink MnO₄⁻ tinge appeared at ${s.titratedMl.toFixed(1)} mL.`,
          accentHex: '#a855f7',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Redox Titration Active',
        equation: `MnO₄⁻(purple) + 5Fe²⁺ + 8H⁺ → Mn²⁺(colorless) + 5Fe³⁺ + 4H₂O   (${s.titratedMl.toFixed(1)} mL)`,
        phenomenon: 'Purple KMnO₄ decolorizes instantly on swirling with Fe²⁺.',
        accentHex: '#c084fc',
      };
    }

    case 'titration_kmno4_oxalic': {
      if (!s.solutionHeated && s.titratedMl === 0) {
        return {
          stage: 'ready',
          badge: 'Oxalic Acid + H₂SO₄ Ready',
          equation: '2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ —(60°C)→ ?   (Warm to 60°C & titrate)',
          phenomenon: 'Warm oxalic acid flask to ~60 °C to overcome activation barrier.',
          accentHex: '#38bdf8',
        };
      }
      if (s.titratedMl >= 17.8) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Autocatalytic Redox',
          equation: '2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ → 2Mn²⁺ + 10CO₂↑ + 8H₂O',
          phenomenon: `Self-indicator pale pink endpoint achieved at ${s.titratedMl.toFixed(1)} mL (Mn²⁺ autocatalyst).`,
          accentHex: '#a855f7',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Hot Redox Titration',
        equation: `2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ → 2Mn²⁺ + 10CO₂↑ + 8H₂O   (${s.titratedMl.toFixed(1)} mL)`,
        phenomenon: `CO₂ bubbles evolving gently (${s.tempC.toFixed(1)} °C) as Mn²⁺ catalyzes decolorization.`,
        accentHex: '#c084fc',
      };
    }

    case 'carbonate': {
      if (!s.primaryReagentAdded) {
        return {
          stage: 'ready',
          badge: 'CO₃²⁻ Salt Ready',
          equation: 'Na₂CO₃(s) + 2HCl(dil.) → ?   (Add Dil. HCl to Tube 1)',
          phenomenon: 'Add primary dilute acid reagent to test for carbonate effervescence.',
          accentHex: '#38bdf8',
        };
      }
      if (s.confirmatoryReagentAdded) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Limewater Milky',
          equation: 'CO₃²⁻ + 2H⁺ → H₂O + CO₂↑   |   CO₂ + Ca(OH)₂ → CaCO₃(white)↓ + H₂O',
          phenomenon: 'Brisk colorless CO₂ turned limewater milky via insoluble calcium carbonate.',
          accentHex: '#10b981',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Brisk Effervescence',
        equation: 'CO₃²⁻(aq) + 2H⁺(aq) → H₂O(l) + CO₂(g)↑',
        phenomenon: 'Colorless odorless CO₂ evolving; pass through limewater to confirm.',
        accentHex: '#f59e0b',
      };
    }

    case 'halide': {
      if (!s.primaryReagentAdded) {
        return {
          stage: 'ready',
          badge: 'Halide Solution Ready',
          equation: 'X⁻(aq) + AgNO₃(aq) → ?   (Add AgNO₃ reagent)',
          phenomenon: 'Acidify with dil. HNO₃ and add AgNO₃ to precipitate silver halide.',
          accentHex: '#38bdf8',
        };
      }
      if (s.confirmatoryReagentAdded) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Halide Confirmed',
          equation: 'Ag⁺ + Cl⁻ → AgCl↓ (NH₄OH soluble: [Ag(NH₃)₂]⁺)  |  AgI↓ (Insoluble Yellow)',
          phenomenon: 'Silver halide precipitate confirmed via NH₄OH solubility differentiation.',
          accentHex: '#10b981',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Silver Halide Precipitating',
        equation: 'Ag⁺(aq) + X⁻(aq) → AgX(s)↓   (Cl⁻ White / Br⁻ Pale Yellow / I⁻ Yellow)',
        phenomenon: 'Curdy precipitate formed; add NH₄OH confirmatory reagent.',
        accentHex: '#eab308',
      };
    }

    case 'nitrate': {
      if (!s.primaryReagentAdded && !s.brownRingFormed) {
        return {
          stage: 'ready',
          badge: 'NO₃⁻ + FeSO₄ Ready',
          equation: 'NO₃⁻ + Fe²⁺ + H₂SO₄ → ?   (Add FeSO₄ & conc. H₂SO₄)',
          phenomenon: 'Add freshly prepared FeSO₄ solution before layering conc. H₂SO₄.',
          accentHex: '#38bdf8',
        };
      }
      if (s.brownRingFormed || s.confirmatoryReagentAdded) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Brown Ring Complex',
          equation: 'NO₃⁻ + 3Fe²⁺ + 4H⁺ → NO + 3Fe³⁺ + 2H₂O   |   [Fe(H₂O)₆]²⁺ + NO → [Fe(H₂O)₅(NO)]²⁺',
          phenomenon: 'Dark brown nitrosyliron(II) ring formed cleanly at the acid–aqueous junction.',
          accentHex: '#d97706',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Reducing Nitrate to NO',
        equation: 'NO₃⁻ + 3Fe²⁺ + 4H⁺ → 3Fe³⁺ + NO(g) + 2H₂O',
        phenomenon: 'Add confirmatory conc. H₂SO₄ carefully down the tube wall.',
        accentHex: '#f59e0b',
      };
    }

    case 'sulphate': {
      if (!s.primaryReagentAdded && !s.confirmatoryReagentAdded) {
        return {
          stage: 'ready',
          badge: 'SO₄²⁻ Solution Ready',
          equation: 'SO₄²⁻(aq) + BaCl₂(aq) → ?   (Add BaCl₂ & conc. HCl)',
          phenomenon: 'Add barium chloride reagent to test for sulphate ions.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Insoluble BaSO₄',
        equation: 'SO₄²⁻(aq) + Ba²⁺(aq) → BaSO₄(s, Heavy White ppt)↓   [Insoluble in HCl]',
        phenomenon: 'Dense white BaSO₄ precipitate remained insoluble even in concentrated HCl.',
        accentHex: '#10b981',
      };
    }

    case 'ammonium': {
      if (!s.primaryReagentAdded && !s.tubeWarmed) {
        return {
          stage: 'ready',
          badge: 'NH₄⁺ Salt Ready',
          equation: 'NH₄⁺ + NaOH —(Δ)→ ?   (Add NaOH, warm & add Nessler reagent)',
          phenomenon: 'Alkalinize and warm gently to liberate ammonia gas.',
          accentHex: '#38bdf8',
        };
      }
      if (s.confirmatoryReagentAdded) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Nessler Brown Precipitate',
          equation: '2K₂[HgI₄] + NH₃ + 3KOH → HgO·Hg(NH₂)I↓ (Red-Brown) + 7KI + 2H₂O',
          phenomenon: 'Ammonia gas formed dense white NH₄Cl fumes with HCl and brown Nessler ppt.',
          accentHex: '#d97706',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Ammonia Gas Liberated',
        equation: 'NH₄⁺(aq) + OH⁻(aq) —(Δ)→ NH₃(g)↑ + H₂O(l)   |   NH₃ + HCl → NH₄Cl(fumes)',
        phenomenon: 'Pungent NH₃ gas evolved; add Nessler confirmatory reagent.',
        accentHex: '#f59e0b',
      };
    }

    case 'cations_123': {
      if (!s.primaryReagentAdded) {
        return {
          stage: 'ready',
          badge: 'Groups I–III Salt Ready',
          equation: 'Cu²⁺ / Fe³⁺ / Al³⁺ + Reagent → ?   (Add Group reagent)',
          phenomenon: 'Add primary group reagent to separate metal cations.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Cation Complexes',
        equation: 'Cu²⁺ + 4NH₃ → [Cu(NH₃)₄]²⁺ (Deep Blue)   |   Fe³⁺ + 3OH⁻ → Fe(OH)₃↓ (Red-Brown)',
        phenomenon: 'Distinctive azure tetraamminecopper(II) & reddish-brown ferric hydroxide formed.',
        accentHex: '#3b82f6',
      };
    }

    case 'cations_456': {
      if (!s.primaryReagentAdded && !s.flameTestDone) {
        return {
          stage: 'ready',
          badge: 'Groups IV–VI Salt Ready',
          equation: 'Ba²⁺ / Ca²⁺ / Zn²⁺ + (NH₄)₂CO₃ → ?   (Add reagent & flame test)',
          phenomenon: 'Precipitate Group V carbonate or perform Bunsen flame emission test.',
          accentHex: '#38bdf8',
        };
      }
      if (s.flameTestDone || s.tubeWarmed) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · 524 nm Emission',
          equation: 'BaCl₂(s) —(Δ)→ Ba* → Ba + hν (524 nm Apple-Green Flame)  |  Ba²⁺ + CrO₄²⁻ → BaCrO₄↓',
          phenomenon: 'Excited Ba²⁺ ions emitted characteristic 524 nm apple-green flame.',
          accentHex: '#22c55e',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Group V Precipitate',
        equation: 'Ba²⁺(aq) + CO₃²⁻(aq) → BaCO₃(s, White ppt)↓',
        phenomenon: 'Perform Bunsen flame test on the burner collar to observe atomic emission.',
        accentHex: '#f59e0b',
      };
    }

    case 'unsaturation': {
      if (!s.primaryReagentAdded) {
        return {
          stage: 'ready',
          badge: 'Alkene Sample Ready',
          equation: 'R–CH=CH₂ + Br₂(orange-brown) → ?   (Add Bromine / Baeyer reagent)',
          phenomenon: 'Test C=C π-bond by electrophilic addition of bromine water.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Decolorization',
        equation: 'R–CH=CH₂ + Br₂(orange) → R–CH(Br)–CH₂(Br) (Colorless Dibromide)',
        phenomenon: 'Orange-brown bromine discharged instantaneously, confirming C=C unsaturation.',
        accentHex: '#10b981',
      };
    }

    case 'phenol_alcohol': {
      if (!s.primaryReagentAdded) {
        return {
          stage: 'ready',
          badge: 'Phenolic Sample Ready',
          equation: 'ArOH + FeCl₃(neutral) → ?   (Add Neutral FeCl₃)',
          phenomenon: 'Add neutral ferric chloride reagent to test for phenolic –OH group.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Ferric Phenoxide Complex',
        equation: '6 C₆H₅OH + FeCl₃ → [Fe(OC₆H₅)₆]³⁻ (Deep Violet) + 3H⁺ + 3HCl',
        phenomenon: 'Intense violet coordination complex confirmed the phenolic hydroxyl group.',
        accentHex: '#a855f7',
      };
    }

    case 'aldehyde_ketone': {
      if (!s.primaryReagentAdded && !s.silverMirrorFormed) {
        return {
          stage: 'ready',
          badge: 'Aldehyde Sample Ready',
          equation: 'R–CHO + 2[Ag(NH₃)₂]⁺ + 3OH⁻ → ?   (Add Tollens reagent & warm)',
          phenomenon: 'Add ammoniacal AgNO₃ (Tollens reagent) and gently warm the test tube.',
          accentHex: '#38bdf8',
        };
      }
      if (s.silverMirrorFormed || s.confirmatoryReagentAdded) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Silver Mirror',
          equation: 'R–CHO + 2[Ag(NH₃)₂]⁺ + 3OH⁻ —(Δ)→ RCOO⁻ + 2Ag(s, Mirror)↓ + 4NH₃ + 2H₂O',
          phenomenon: 'Metallic silver deposited as a reflective mirror coating along the inner tube wall!',
          accentHex: '#e2e8f0',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Tollens Reagent Added',
        equation: 'R–CHO + [Ag(NH₃)₂]⁺ → Reducing Ag⁺ to Ag⁰...',
        phenomenon: 'Warm tube & add confirmatory Tollens step to deposit the silver mirror.',
        accentHex: '#f59e0b',
      };
    }

    case 'carboxylic': {
      if (!s.primaryReagentAdded && !s.tubeWarmed) {
        return {
          stage: 'ready',
          badge: 'Carboxylic Acid Ready',
          equation: 'RCOOH + NaHCO₃ → ?   |   RCOOH + C₂H₅OH ⇌ ?   (Add reagent & warm)',
          phenomenon: 'Test –COOH group via NaHCO₃ effervescence and Fischer esterification.',
          accentHex: '#38bdf8',
        };
      }
      if (s.confirmatoryReagentAdded || s.tubeWarmed) {
        return {
          stage: 'formed',
          badge: 'Equation Formed · Esterification & CO₂',
          equation: 'RCOOH + C₂H₅OH ⇌(H⁺) RCOOC₂H₅ (Fruity Ester) + H₂O   |   RCOOH + NaHCO₃ → RCOONa + CO₂↑',
          phenomenon: 'Brisk CO₂ effervescence + pleasant fruity ethyl ester aroma confirmed –COOH.',
          accentHex: '#10b981',
        };
      }
      return {
        stage: 'mixing',
        badge: 'Bicarbonate Effervescence',
        equation: 'RCOOH + NaHCO₃ → RCOONa + H₂O + CO₂(g)↑',
        phenomenon: 'Warm with ethanol + H₂SO₄ to form the fruity ester.',
        accentHex: '#f59e0b',
      };
    }

    case 'amine': {
      if (!s.primaryReagentAdded) {
        return {
          stage: 'ready',
          badge: 'Primary Aromatic Amine Ready',
          equation: 'ArNH₂ + HNO₂ + HCl —(0–5°C)→ ?   (Diazotize & couple β-Naphthol)',
          phenomenon: 'Add NaNO₂/HCl in ice bath, then couple with alkaline β-naphthol.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Scarlet Azo Dye',
        equation: 'C₆H₅NH₂ + NaNO₂ + 2HCl → C₆H₅N₂⁺Cl⁻ + β-Naphthol → Scarlet Azo Dye↓',
        phenomenon: 'Brilliant scarlet-red azo dye precipitated immediately upon coupling.',
        accentHex: '#ef4444',
      };
    }

    case 'kinetics_cross': {
      if (s.reagentAddedCount === 0) {
        return {
          stage: 'ready',
          badge: 'Na₂S₂O₃ + HCl Ready',
          equation: 'S₂O₃²⁻(aq) + 2H⁺(aq) → ?   (Mix HCl to start colloidal S clock)',
          phenomenon: 'Add HCl into sodium thiosulphate over the black "X" tile.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: 'formed',
        badge: 'Equation Formed · Colloidal Sulphur Clock',
        equation: 'Na₂S₂O₃(aq) + 2HCl(aq) → 2NaCl(aq) + SO₂(g) + H₂O(l) + S(s, Colloid)↓',
        phenomenon: 'Fine yellow colloidal sulphur precipitating — progressively obscuring the "X" mark.',
        accentHex: '#eab308',
      };
    }

    case 'enthalpy_neut': {
      if (s.reagentAddedCount === 0) {
        return {
          stage: 'ready',
          badge: 'HCl(aq) in Calorimeter',
          equation: 'H⁺(aq) + OH⁻(aq) → ?   (Pour NaOH to measure ΔT)',
          phenomenon: `Initial temperature T₁ = ${s.tempC.toFixed(1)} °C.`,
          accentHex: '#38bdf8',
        };
      }
      const dT = Math.max(0, s.tempC - 25.0);
      return {
        stage: 'formed',
        badge: 'Equation Formed · Enthalpy of Neutralization',
        equation: `HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)   |   ΔT = +${dT.toFixed(1)} °C`,
        phenomenon: 'Exothermic proton-hydroxide neutralization released heat (ΔH° ≈ −57.1 kJ/mol).',
        accentHex: '#f97316',
      };
    }

    case 'enthalpy_sol': {
      if (s.saltAddedG === 0) {
        return {
          stage: 'ready',
          badge: 'Distilled Water Ready',
          equation: 'KNO₃(s) + aq → ?   (Dissolve KNO₃ in calorimeter)',
          phenomenon: `Baseline T₁ = ${s.tempC.toFixed(1)} °C. Add KNO₃ salt to measure endothermic drop.`,
          accentHex: '#38bdf8',
        };
      }
      const drop = Math.max(0, 25.0 - s.tempC);
      return {
        stage: 'formed',
        badge: 'Equation Formed · Endothermic Dissolution',
        equation: `KNO₃(s) + H₂O(l) → K⁺(aq) + NO₃⁻(aq)   |   ΔT = −${drop.toFixed(1)} °C`,
        phenomenon: `Lattice enthalpy exceeded hydration enthalpy (ΔH_sol > 0; T dropped to ${s.tempC.toFixed(1)} °C).`,
        accentHex: '#06b6d4',
      };
    }
  }

  return {
    stage: s.reagentAddedCount > 0 ? 'formed' : 'ready',
    badge: s.reagentAddedCount > 0 ? 'Reaction Active' : 'Reactants Ready',
    equation: exp.formulaLabel,
    phenomenon: exp.summary,
    accentHex: '#38bdf8',
  };
}

function evaluatePhysicsEquation(
  exp: ExperimentConfig,
  s: RigState,
  isExam: boolean
): LiveEquationState {
  const hideNum = (val: string) => (isExam ? '?' : val);

  switch (exp.subMode) {
    case 'vernier_sphere': {
      const msr = Math.floor(s.jawPositionMm) / 10;
      const vsc = Math.round((s.jawPositionMm * 10) % 10);
      const active = s.zeroErrorChecked || s.measurementCount > 0 || Math.abs(s.jawPositionMm - 12) > 0.2;
      return {
        stage: s.measurementCount >= 2 ? 'formed' : active ? 'mixing' : 'ready',
        badge: s.measurementCount >= 2 ? 'Equation Evaluated · Vernier Calliper' : 'Vernier Scale Active',
        equation: `D = MSR(${msr.toFixed(1)} cm) + VSC(${vsc} × 0.01) = ${(s.jawPositionMm / 10).toFixed(2)} cm`,
        phenomenon: `Captured ${s.measurementCount} reading(s); clamp sphere gently without backlash.`,
        accentHex: '#38bdf8',
      };
    }

    case 'vernier_beaker': {
      const dCm = (s.jawPositionMm / 10).toFixed(2);
      const rCm = s.jawPositionMm / 20;
      const estVol = (Math.PI * rCm * rCm * 7.5).toFixed(1);
      return {
        stage: s.measurementCount >= 2 ? 'formed' : s.measurementCount > 0 ? 'mixing' : 'ready',
        badge: s.measurementCount >= 2 ? 'Equation Evaluated · Cylinder Volume' : 'Internal/Depth Measuring',
        equation: `V = π (D/2)² h = π × (${(rCm).toFixed(2)})² × h   [D = ${dCm} cm, V ≈ ${hideNum(estVol)} cm³]`,
        phenomenon: `Readings logged: ${s.measurementCount}. Measure both internal diameter & depth.`,
        accentHex: '#38bdf8',
      };
    }

    case 'screw_wire':
    case 'screw_lamina': {
      const mmVal = (s.thimbleRotation * 0.01).toFixed(2);
      const lsr = Math.floor(s.thimbleRotation / 100);
      const csr = Math.round(s.thimbleRotation % 100);
      return {
        stage: s.measurementCount >= 2 ? 'formed' : s.zeroErrorChecked ? 'mixing' : 'ready',
        badge: s.measurementCount >= 2 ? 'Equation Evaluated · Micrometer' : 'Thimble Screw Gauge',
        equation: `d = LSR(${lsr} mm) + CSR(${csr} × 0.01 mm) = ${mmVal} mm`,
        phenomenon: `Ratchet clicks: ${s.measurementCount}. Avoid over-tightening anvil.`,
        accentHex: '#38bdf8',
      };
    }

    case 'spherometer': {
      const h = Math.abs(s.spherometerHeightMm);
      const l = 40; // 40 mm leg pitch
      const rMm = h > 0.05 ? (l * l) / (6 * h) + h / 2 : 0;
      const stage =
        s.measurementCount >= 1 && s.plateMode === 'curved'
          ? 'formed'
          : s.zeroErrorChecked || s.plateMode === 'curved' || s.measurementCount > 0
            ? 'mixing'
            : 'ready';
      return {
        stage,
        badge:
          stage === 'formed'
            ? 'Equation Evaluated · Radius of Curvature'
            : s.plateMode === 'curved'
              ? 'Curvature Equation Live'
              : 'Flat Reference Plate',
        equation: `R = (l² / 6h) + (h / 2)   |   h = ${h.toFixed(2)} mm → R = ${rMm > 0 ? hideNum((rMm / 10).toFixed(1) + ' cm') : '∞ (Flat)'}`,
        phenomenon: 'Zero on flat glass plate first, then measure sagitta h on convex mirror.',
        accentHex: stage === 'formed' ? '#10b981' : '#38bdf8',
      };
    }

    case 'beam_balance': {
      const diff = (s.leftMassG - s.rightMassG).toFixed(1);
      const balanced = s.beamArrestReleased && Math.abs(s.leftMassG - s.rightMassG) <= 0.5;
      return {
        stage: balanced ? 'formed' : s.beamArrestReleased ? 'mixing' : 'ready',
        badge: balanced ? 'Equation Balanced · Στ = 0' : 'Analytical Beam Balance',
        equation: `m_left · L = m_right · L   |   Δm = ${diff} g (Right Pan = ${s.rightMassG.toFixed(1)} g)`,
        phenomenon: balanced ? 'Pointer oscillating symmetrically around zero index!' : 'Adjust right-pan masses & release beam arrest.',
        accentHex: balanced ? '#10b981' : '#38bdf8',
      };
    }

    case 'parallelogram': {
      const thetaRad = (s.angleDeg * Math.PI) / 180;
      const res = Math.sqrt(s.weightP ** 2 + s.weightQ ** 2 + 2 * s.weightP * s.weightQ * Math.cos(thetaRad));
      return {
        stage: s.measurementCount >= 1 ? 'formed' : 'mixing',
        badge: 'Vector Resultant Live',
        equation: `W = √(${s.weightP}² + ${s.weightQ}² + 2·${s.weightP}·${s.weightQ}·cos ${s.angleDeg}°) = ${res.toFixed(1)} gf`,
        phenomenon: 'Check knot equilibrium at center of Gravesand apparatus.',
        accentHex: '#38bdf8',
      };
    }

    case 'inclined_plane': {
      const sinT = Math.sin((s.angleDeg * Math.PI) / 180);
      return {
        stage: s.measurementCount >= 1 ? 'formed' : 'mixing',
        badge: 'Inclined Force Resolution',
        equation: `F = M g sin(${s.angleDeg}°)   |   sin θ = ${sinT.toFixed(3)}, Pan W = ${s.panMassG} gf`,
        phenomenon: 'Verify rolling equilibrium uphill and downhill to eliminate friction.',
        accentHex: '#38bdf8',
      };
    }

    case 'friction': {
      const normalN = 200 + s.extraNormalMassG;
      const mu = (s.panMassG / normalN).toFixed(2);
      return {
        stage: s.measurementCount >= 2 ? 'formed' : 'mixing',
        badge: 'Limiting Friction Live',
        equation: `μ_s = F_lim / R = ${s.panMassG} gf / ${normalN} gf = ${mu}`,
        phenomenon: 'Observe block just beginning to slide on horizontal plane.',
        accentHex: '#38bdf8',
      };
    }

    case 'spring': {
      const extCm = (s.springLoadG * 0.04).toFixed(2);
      return {
        stage: s.springLoadG >= 150 ? 'formed' : s.springLoadG > 0 ? 'mixing' : 'ready',
        badge: "Hooke's Law Live",
        equation: `F = k · Δx   |   m = ${s.springLoadG} g, Δx = ${extCm} cm → k = ${(0.0098 * 100 / 4).toFixed(1)} N/m`,
        phenomenon: 'Record extension on vertical mirror scale for each 50 g slotted weight.',
        accentHex: '#38bdf8',
      };
    }

    case 'pendulum': {
      const L = s.pendulumLengthCm / 100;
      const T = 2 * Math.PI * Math.sqrt(L / 9.81);
      return {
        stage: s.pendulumRunning && s.measurementCount >= 1 ? 'formed' : s.pendulumRunning ? 'mixing' : 'ready',
        badge: s.pendulumRunning ? 'Harmonic Oscillation Live' : 'Simple Pendulum Ready',
        equation: `T = 2π√(L/g) = ${T.toFixed(2)} s   |   g = 4π²(${L.toFixed(2)})/${(T * T).toFixed(2)} = ${hideNum('9.81')} m/s²`,
        phenomenon: s.pendulumRunning ? 'Counting 20 oscillations across mean equilibrium position.' : 'Adjust string length L and start oscillation.',
        accentHex: s.pendulumRunning ? '#10b981' : '#38bdf8',
      };
    }

    case 'boyles': {
      const pTot = 76 + s.boylePressureOffsetCm;
      const vEst = (76 * 12 / Math.max(30, pTot)).toFixed(2);
      return {
        stage: s.measurementCount >= 2 ? 'formed' : 'mixing',
        badge: "Boyle's Law Isothermal",
        equation: `P·V = Constant   |   P = ${pTot} cmHg × V = ${vEst} cm³ = ${(pTot * Number(vEst)).toFixed(0)}`,
        phenomenon: 'At constant temperature, raising Hg reservoir compresses trapped air column.',
        accentHex: '#38bdf8',
      };
    }

    case 'calorimeter': {
      if (!s.calorimeterWaterAdded && !s.solidTransferred) {
        return {
          stage: 'ready',
          badge: 'Calorimeter Empty',
          equation: 'm_s c_s (T₂ − T₃) = (m_w c_w + m_c c_c)(T₃ − T₁)',
          phenomenon: 'Add cold water to copper calorimeter, then transfer heated metal solid.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: s.solidTransferred && s.stirrerCount > 0 ? 'formed' : 'mixing',
        badge: s.solidTransferred ? 'Thermal Equilibrium Reached' : 'Calorimeter Filled',
        equation: `Q_lost = Q_gained   |   T_mix = ${s.tempC.toFixed(1)} °C`,
        phenomenon: 'Heat lost by hot solid equals heat gained by water + copper calorimeter.',
        accentHex: s.solidTransferred ? '#f97316' : '#f59e0b',
      };
    }

    case 'cooling_curve': {
      return {
        stage: s.stirrerCount >= 3 ? 'formed' : s.calorimeterWaterAdded ? 'mixing' : 'ready',
        badge: "Newton's Cooling Curve",
        equation: `−dT/dt = k(T − T_room)   |   T = ${s.tempC.toFixed(1)} °C, ΔT = ${(s.tempC - 25).toFixed(1)} °C`,
        phenomenon: 'Cooling rate decays exponentially toward ambient 25 °C.',
        accentHex: '#f97316',
      };
    }

    case 'ohms_law':
    case 'series_parallel':
    case 'resistance_length':
    case 'resistivity': {
      if (!s.keyClosed || s.wiresConnected < 4) {
        return {
          stage: 'ready',
          badge: 'Circuit Open',
          equation: `${exp.formulaLabel}   (Connect 4 wires & close key K)`,
          phenomenon: `Connected ${s.wiresConnected}/4 leads. Close plug key to energize circuit.`,
          accentHex: '#38bdf8',
        };
      }
      const rCalc = s.ammeterA > 0.01 ? (s.voltmeterV / s.ammeterA).toFixed(2) : '—';
      return {
        stage: s.measurementCount >= 2 ? 'formed' : 'mixing',
        badge: "Ohm's Law Circuit Active",
        equation: `V = I · R   |   ${s.voltmeterV.toFixed(2)} V = ${s.ammeterA.toFixed(2)} A × ${hideNum(rCalc + ' Ω')}`,
        phenomenon: 'Slide rheostat wiper to capture V–I pairs for linear slope.',
        accentHex: '#10b981',
      };
    }

    case 'galvanometer':
    case 'galv_ammeter':
    case 'galv_voltmeter': {
      if (!s.keyClosed || s.wiresConnected < 4) {
        return {
          stage: 'ready',
          badge: 'Half-Deflection Bridge Open',
          equation: exp.formulaLabel,
          phenomenon: 'Connect leads & close Key K₁ to observe full-scale θ deflection.',
          accentHex: '#38bdf8',
        };
      }
      const gEst = ((s.resistanceBoxR * s.shuntBoxS) / Math.max(1, s.resistanceBoxR - s.shuntBoxS)).toFixed(1);
      return {
        stage: s.key2Closed ? 'formed' : 'mixing',
        badge: s.key2Closed ? 'Half-Deflection Achieved' : 'Full Deflection θ',
        equation: `G = RS/(R−S) = (${s.resistanceBoxR}×${s.shuntBoxS})/(${s.resistanceBoxR}−${s.shuntBoxS}) = ${hideNum(gEst + ' Ω')}  [θ = ${s.galvDeflection}°]`,
        phenomenon: 'Close shunt Key K₂ and tune S until deflection halves.',
        accentHex: s.key2Closed ? '#10b981' : '#f59e0b',
      };
    }

    case 'sonometer': {
      return {
        stage: s.electromagnetOn && s.measurementCount >= 1 ? 'formed' : s.electromagnetOn ? 'mixing' : 'ready',
        badge: s.electromagnetOn ? 'Resonant Standing Wave' : 'Electromagnet Off',
        equation: `f_AC = (1/4l)√(T/m)   |   l = ${s.bridgeDistanceCm.toFixed(1)} cm  (Paper rider resonance at 50 Hz)`,
        phenomenon: s.electromagnetOn ? 'Slide wooden bridges to locate maximum antinode vibration.' : 'Turn ON AC electromagnet coil.',
        accentHex: s.electromagnetOn ? '#10b981' : '#38bdf8',
      };
    }

    case 'concave_mirror':
    case 'convex_mirror':
    case 'convex_lens':
    case 'concave_lens': {
      const u = Math.max(5, Math.abs(s.lensOrMirrorPosCm - s.objectPosCm));
      const v = Math.max(5, Math.abs(s.imagePinPosCm - s.lensOrMirrorPosCm));
      const fCalc =
        exp.subMode === 'concave_lens'
          ? (u * v) / Math.max(1, u - v)
          : (u * v) / Math.max(1, u + v);
      return {
        stage: s.measurementCount >= 1 ? 'formed' : 'mixing',
        badge: 'Optical Bench Conjugate Equation',
        equation: `${exp.formulaLabel}   |   u = ${u.toFixed(1)} cm, v = ${v.toFixed(1)} cm → f = ${hideNum(fCalc.toFixed(1) + ' cm')}`,
        phenomenon: 'Align inverted real image needle tip-to-tip with zero parallax.',
        accentHex: '#38bdf8',
      };
    }

    case 'prism': {
      const nGlass = 1.52;
      const aRad = Math.PI / 3;
      const iRad = (s.prismAngleIncidence * Math.PI) / 180;
      const r1 = Math.asin(Math.sin(iRad) / nGlass);
      const r2 = aRad - r1;
      const eRad = Math.asin(Math.min(0.999, nGlass * Math.sin(r2)));
      const dev = ((iRad + eRad - aRad) * 180) / Math.PI;
      return {
        stage: s.measurementCount >= 2 ? 'formed' : 'mixing',
        badge: 'Snell Refraction Through 60° Prism',
        equation: `δ = i + e − A = ${s.prismAngleIncidence}° + ${((eRad * 180) / Math.PI).toFixed(1)}° − 60° = ${dev.toFixed(1)}°`,
        phenomenon: 'Locate minimum deviation angle δₘ where i ≈ e to compute μ.',
        accentHex: '#a855f7',
      };
    }

    case 'travelling_microscope': {
      return {
        stage: s.slabPlaced && s.powderSprinkled ? 'formed' : s.slabPlaced ? 'mixing' : 'ready',
        badge: 'Apparent Depth Snell Equation',
        equation: `μ = Real Depth / Apparent Depth = (R₃ − R₁) / (R₃ − R₂)   [h = ${s.microscopeHeightMm.toFixed(2)} mm]`,
        phenomenon: 'Focus cross-wire first on ink dot, then through slab, then on lycopodium powder.',
        accentHex: '#38bdf8',
      };
    }

    case 'liquid_mirror': {
      return {
        stage: s.liquidAdded && s.measurementCount >= 1 ? 'formed' : s.liquidAdded ? 'mixing' : 'ready',
        badge: 'Liquid Plano-Concave Lens',
        equation: `μ_liq = 1 + (R / f_liq) = R / R′   [Pin height = ${s.imagePinPosCm.toFixed(1)} cm]`,
        phenomenon: s.liquidAdded ? 'Focus pointer without parallax over liquid-lens combination.' : 'Add water drop under convex lens.',
        accentHex: '#38bdf8',
      };
    }

    case 'diode': {
      if (!s.keyClosed) {
        return {
          stage: 'ready',
          badge: 'Diode Bias Open',
          equation: 'I = I₀ (e^(qV / nkT) − 1)   (Close circuit key)',
          phenomenon: 'Close key and sweep forward voltage across 0.7 V silicon knee.',
          accentHex: '#38bdf8',
        };
      }
      return {
        stage: s.measurementCount >= 2 ? 'formed' : 'mixing',
        badge: s.reverseBias ? 'Reverse Bias Saturation' : 'Forward Shockley Curve',
        equation: s.reverseBias
          ? `Reverse Bias: V_r = ${s.voltmeterV.toFixed(2)} V, I_r = ${s.ammeterA} μA`
          : `I = I₀(e^(qV/nkT) − 1)   |   V_f = ${s.voltmeterV.toFixed(2)} V, I_f = ${s.ammeterA} mA`,
        phenomenon: !s.reverseBias && s.voltmeterV >= 0.7 ? 'Barrier potential overcome — forward current rising sharply!' : 'Adjust rheostat across knee voltage.',
        accentHex: !s.reverseBias && s.voltmeterV >= 0.7 ? '#10b981' : '#f59e0b',
      };
    }
  }

  return {
    stage: s.measurementCount > 0 ? 'formed' : 'ready',
    badge: 'Physics Equation Live',
    equation: exp.formulaLabel,
    phenomenon: exp.summary,
    accentHex: '#38bdf8',
  };
}

function evaluateBiologyEquation(exp: ExperimentConfig, s: RigState): LiveEquationState {
  switch (exp.subMode) {
    case 'respiration': {
      return {
        stage: s.osmosisTimeHr >= 1.0 ? 'formed' : s.osmosisTimeHr > 0 ? 'mixing' : 'ready',
        badge: s.osmosisTimeHr >= 1.0 ? 'Equation Formed · KOH Absorbs CO₂' : 'Germinating Seeds Ready',
        equation: 'C₆H₁₂O₆ + 6O₂ → 6CO₂↑ + 6H₂O + 38 ATP   |   CO₂ + 2KOH → K₂CO₃ + H₂O',
        phenomenon: s.osmosisTimeHr > 0
          ? `Vacuum created by CO₂ absorption pulled colored water up ${(s.osmosisTimeHr * 2.4).toFixed(1)} cm!`
          : 'Advance respiration time to watch KOH absorb respired CO₂.',
        accentHex: '#10b981',
      };
    }

    case 'osmoscope': {
      return {
        stage: s.osmosisTimeHr >= 1.0 ? 'formed' : s.osmosisTimeHr > 0 ? 'mixing' : 'ready',
        badge: s.osmosisTimeHr >= 1.0 ? 'Equation Formed · Endosmosis' : 'Potato Osmoscope Ready',
        equation: `Ψ_w = Ψ_s + Ψ_p   |   Δh = +${(s.osmosisTimeHr * 2.6).toFixed(1)} cm at t = ${s.osmosisTimeHr.toFixed(1)} hr`,
        phenomenon: 'Water flows down water-potential gradient across semipermeable potato parenchyma.',
        accentHex: '#10b981',
      };
    }

    case 'plasmolysis': {
      return {
        stage: s.osmosisTimeHr >= 1.0 ? 'formed' : s.osmosisTimeHr > 0 ? 'mixing' : 'ready',
        badge: s.osmosisTimeHr >= 1.0 ? 'Equation Formed · Exosmosis (Ψp = 0)' : 'Rhoeo Peel Mounted',
        equation: 'Cell in Hypertonic Sucrose → Exosmosis (H₂O out) → Protoplast Shrinks (Ψ_p → 0)',
        phenomenon: `Plasmolysis progress ${(Math.min(1, s.osmosisTimeHr / 2) * 100).toFixed(0)}% — plasma membrane detaching from cell wall.`,
        accentHex: '#a855f7',
      };
    }

    case 'imbibition': {
      const pct = (((s.swollenWeightG - s.dryWeightG) / Math.max(0.1, s.dryWeightG)) * 100).toFixed(1);
      return {
        stage: s.osmosisTimeHr >= 1.0 ? 'formed' : s.osmosisTimeHr > 0 ? 'mixing' : 'ready',
        badge: s.osmosisTimeHr >= 1.0 ? 'Equation Formed · Hydrophilic Matric Pull' : 'Dry Raisins Ready',
        equation: `% Imbibition = [(W₂ − W₁)/W₁] × 100 = +${pct}%   (Ψ_m < 0)`,
        phenomenon: 'Hydrophilic colloids imbibe water against concentration gradient.',
        accentHex: '#10b981',
      };
    }

    case 'transpiration': {
      return {
        stage: s.cobaltBlueTested ? 'formed' : 'ready',
        badge: s.cobaltBlueTested ? 'Equation Formed · CoCl₂ Hydration' : 'Dry Blue CoCl₂ Paper',
        equation: 'CoCl₂ (Anhydrous Blue) + 6H₂O (Transpired Vapor) → [Co(H₂O)₆]Cl₂ (Pink)',
        phenomenon: s.cobaltBlueTested
          ? 'Abaxial (lower) leaf surface turned CoCl₂ strip pink ~3× faster than adaxial surface!'
          : 'Press CoCl₂ indicator strips against leaf surfaces.',
        accentHex: s.cobaltBlueTested ? '#ec4899' : '#3b82f6',
      };
    }

    case 'chromatography': {
      return {
        stage: s.chromatographyProgress >= 0.7 ? 'formed' : s.chromatographyProgress > 0 ? 'mixing' : 'ready',
        badge: s.chromatographyProgress >= 0.7 ? 'Equation Formed · Pigment Rf Resolved' : 'Spinach Extract Spot Ready',
        equation: `R_f = d_pigment / d_solvent   |   Chl-b (0.42), Chl-a (0.65), Xanthophyll (0.76), Carotene (0.95)`,
        phenomenon: `Solvent front travelled ${(s.chromatographyProgress * 100).toFixed(0)}% up Whatman strip.`,
        accentHex: '#10b981',
      };
    }

    case 'food_test': {
      const tests = [
        'Starch + I₂ (KI) → Blue-Black Amylose Complex',
        'Glucose + Cu²⁺(Benedict) —(Δ)→ Cu₂O↓ (Brick-Red)',
        'Protein + Cu²⁺(OH⁻) [Biuret] → Violet Coordination Complex',
        'Lipid + Sudan III → Crimson Fat Globule Layer',
      ];
      const idx = Math.min(tests.length - 1, Math.max(0, s.spotTileTested - 1));
      return {
        stage: s.spotTileTested >= 3 ? 'formed' : s.spotTileTested > 0 ? 'mixing' : 'ready',
        badge: s.spotTileTested > 0 ? `Biochemical Assay ${s.spotTileTested}/5` : 'Food Reagents Ready',
        equation: s.spotTileTested > 0 ? tests[idx] : 'Test Food Extracts with Iodine, Benedict, Biuret & Sudan III',
        phenomenon: 'Spot-tile wells reveal macromolecule presence via characteristic chromophore shifts.',
        accentHex: '#10b981',
      };
    }

    case 'amylase': {
      return {
        stage: s.spotTileTested >= 4 ? 'formed' : s.spotTileTested > 0 ? 'mixing' : 'ready',
        badge: s.spotTileTested >= 4 ? 'Equation Formed · Achromic Point' : 'Enzymatic Hydrolysis',
        equation: '(C₆H₁₀O₅)ₙ (Starch) + n H₂O —(Salivary Amylase, 37°C, pH 6.8)→ n C₁₂H₂₂O₁₁ (Maltose)',
        phenomenon: s.spotTileTested >= 4 ? 'Achromic point reached — Iodine remains yellow-brown (all starch digested)!' : `Tested ${s.spotTileTested}/5 time intervals on spotting tile.`,
        accentHex: '#10b981',
      };
    }

    default: {
      const mag = 10 * s.objectivePower;
      const focused = s.slidePlaced && s.focusSharpness >= 75;
      return {
        stage: focused ? 'formed' : s.slidePlaced ? 'mixing' : 'ready',
        badge: focused ? 'Equation Evaluated · Sharp Optical Image' : 'Compound Optics Active',
        equation: `${exp.formulaLabel}   |   M = 10× × ${s.objectivePower}× = ${mag}×`,
        phenomenon: s.slidePlaced
          ? `Slide mounted & stained · Sharpness ${Math.round(s.focusSharpness)}%`
          : 'Place prepared stained specimen slide on microscope stage.',
        accentHex: focused ? '#10b981' : '#38bdf8',
      };
    }
  }
}
