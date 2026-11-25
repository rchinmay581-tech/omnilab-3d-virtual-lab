import { ExperimentConfig, VivaQuestion } from '../types/lab';

type PartialViva = Omit<VivaQuestion, 'id'>;

const SUBMODE_VIVA_BANK: Record<string, PartialViva[]> = {
  vernier_sphere: [
    {
      question: 'What is the standard Least Count (LC) of a metric Vernier Calliper with 10 Vernier divisions matching 9 mm?',
      options: ['0.1 mm (0.01 cm)', '0.01 mm', '1.0 mm', '0.5 mm'],
      correctIndex: 0,
      explanation: 'LC = 1 MSD − 1 VSD = 1 mm − 0.9 mm = 0.1 mm = 0.01 cm.',
    },
    {
      question: 'Why must you record at least three perpendicular diameter readings on a sphere?',
      options: [
        'To eliminate random zero error',
        'To average out slight non-uniformity or ellipticity of the sphere',
        'To calibrate the depth strip',
        'To increase the least count',
      ],
      correctIndex: 1,
      explanation: 'Measuring along mutually perpendicular axes minimizes error from slight geometric asymmetry.',
    },
    {
      question: 'If the zero of the Vernier scale lies to the right of the main scale zero when jaws are closed, the zero error is:',
      options: ['Negative', 'Zero', 'Positive (subtracted from reading)', 'Infinite'],
      correctIndex: 2,
      explanation: 'A right-shifted zero reads slightly higher than zero, giving positive zero error that must be subtracted.',
    },
  ],
  vernier_beaker: [
    {
      question: 'Which part of the Vernier Calliper measures the internal diameter of a hollow beaker?',
      options: ['Lower external jaws', 'Upper internal jaws', 'Tail depth strip', 'Thumb locking screw'],
      correctIndex: 1,
      explanation: 'The upper pair of outward-facing jaws touches inner cylinder walls to measure internal diameter.',
    },
    {
      question: 'Which part of the Vernier Calliper extends into the beaker to measure depth?',
      options: ['Depth gauge strip', 'Upper jaws', 'Vernier main screw', 'Retainer nut'],
      correctIndex: 0,
      explanation: 'The thin metallic tail strip slides out with the Vernier jaw to gauge depth from rim to floor.',
    },
    {
      question: 'How is internal volume calculated from internal diameter D and depth h?',
      options: ['πD²h', 'π(D/2)²h', '2πDh', '(4/3)π(D/2)³'],
      correctIndex: 1,
      explanation: 'Cylinder volume V = πr²h = π(D/2)²h.',
    },
  ],
  screw_wire: [
    {
      question: 'If a screw gauge has pitch 1 mm and 100 circular scale divisions, what is its least count?',
      options: ['0.1 mm', '0.01 mm', '0.001 mm', '0.05 mm'],
      correctIndex: 1,
      explanation: 'LC = Pitch / Number of circular divisions = 1 mm / 100 = 0.01 mm.',
    },
    {
      question: 'What is the purpose of the friction ratchet clutch on a micrometer screw gauge?',
      options: [
        'To speed up spindle travel',
        'To apply uniform gentle pressure and avoid deforming the wire',
        'To lock the circular scale',
        'To eliminate backlash error automatically',
      ],
      correctIndex: 1,
      explanation: 'The ratchet slips once gentle contact is reached, preventing crushing soft copper wire.',
    },
    {
      question: 'Backlash error in a screw gauge occurs due to:',
      options: [
        'Thermal expansion of brass',
        'Wear/looseness between screw and nut threads when reversing direction',
        'Parallax in circular scale',
        'Magnetic interference',
      ],
      correctIndex: 1,
      explanation: 'Reversing rotation causes a lag before the spindle moves; always rotate in one direction when taking a reading.',
    },
  ],
  spherometer: [
    {
      question: 'What geometric shape do the three fixed outer legs of a spherometer form?',
      options: ['Right-angled triangle', 'Equilateral triangle', 'Isosceles triangle', 'Square'],
      correctIndex: 1,
      explanation: 'The three outer legs form an equilateral triangle of side length l around the central screw.',
    },
    {
      question: 'In the spherometer formula R = l²/(6h) + h/2, what does h represent?',
      options: [
        'Pitch of the screw',
        'Sagitta (height of curved surface above the plane of the 3 outer legs)',
        'Thickness of the glass plate',
        'Radius of the circular disc',
      ],
      correctIndex: 1,
      explanation: 'h is the vertical displacement between the flat reference plane and the apex of the spherical surface.',
    },
    {
      question: 'Why must the central screw first be zeroed on a flat optically plane glass plate?',
      options: [
        'To establish the zero-height reference plane where all 4 legs are coplanar',
        'To polish the tip of the central screw',
        'To measure refractive index',
        'To prevent magnetic drift',
      ],
      correctIndex: 0,
      explanation: 'Flat-plate contact gives h₀ so sagitta h = h_curved − h_flat can be measured accurately.',
    },
  ],
  pendulum: [
    {
      question: 'What is the shape of the graph plotted between pendulum length L and time period squared T²?',
      options: ['Hyperbola', 'Straight line passing through the origin', 'Parabola', 'Horizontal line'],
      correctIndex: 1,
      explanation: 'Since T = 2π√(L/g), T² = (4π²/g)L, so L vs. T² is directly proportional (linear).',
    },
    {
      question: 'Why should angular amplitude θ of a simple pendulum remain small (< 10°)?',
      options: [
        'To reduce air friction to zero',
        'So sin(θ) ≈ θ holds, keeping motion Simple Harmonic (SHM)',
        'To keep the string taut only at top',
        'So mass of the bob affects the period',
      ],
      correctIndex: 1,
      explanation: 'SHM approximation sin θ ≈ θ holds accurately only for small angular displacements.',
    },
    {
      question: 'What is the length of a "seconds pendulum" (T = 2.0 s) on Earth?',
      options: ['~50 cm', '~99.3 cm (~1 m)', '~200 cm', '~25 cm'],
      correctIndex: 1,
      explanation: 'Setting T = 2 s in T = 2π√(L/g) yields L = g/π² ≈ 0.993 m ≈ 100 cm.',
    },
  ],
  hooke_law: [
    {
      question: 'Within the elastic limit, Hooke’s law states that:',
      options: [
        'Extension is inversely proportional to load',
        'Extension is directly proportional to restoring force / load',
        'Spring constant increases with mass',
        'Period is independent of mass',
      ],
      correctIndex: 1,
      explanation: 'F = kx, so extension x varies linearly with applied load F = mg inside the elastic limit.',
    },
    {
      question: 'What does the slope of Load (F in N) vs. Extension (x in m) represent?',
      options: ['Work done', 'Spring stiffness constant k (N/m)', 'Young’s modulus', 'Potential energy'],
      correctIndex: 1,
      explanation: 'Slope ΔF / Δx equals the spring force constant k.',
    },
    {
      question: 'What happens if you exceed the elastic limit of the helical spring?',
      options: [
        'It acquires permanent plastic deformation and no longer returns to zero',
        'Its spring constant doubles',
        'It cools down rapidly',
        'Hooke’s law holds even better',
      ],
      correctIndex: 0,
      explanation: 'Beyond the yield point, permanent set remains after unloading.',
    },
  ],
  ohm_law: [
    {
      question: 'Why must an ammeter be connected in series and a voltmeter in parallel?',
      options: [
        'Ammeter has low resistance to pass full current; voltmeter has high resistance to draw negligible current',
        'Ammeter has high resistance; voltmeter has zero resistance',
        'To double battery EMF',
        'Only for AC circuits',
      ],
      correctIndex: 0,
      explanation: 'Low-resistance series ammeter avoids dropping voltage; high-resistance parallel voltmeter avoids shunting load current.',
    },
    {
      question: 'How is wire resistance R obtained from a V vs. I graph?',
      options: ['Area under the curve', 'Slope (ΔV / ΔI) of the straight line', 'Y-intercept', '1 / Y-intercept'],
      correctIndex: 1,
      explanation: 'By Ohm’s law V = IR, the linear slope ΔV/ΔI directly gives resistance R.',
    },
    {
      question: 'Why should the plug key be opened between readings in Ohm’s law?',
      options: [
        'To prevent Joule heating (I²Rt) from raising wire temperature and altering resistance',
        'To reverse battery polarity',
        'To discharge the ammeter coil',
        'To increase EMF',
      ],
      correctIndex: 0,
      explanation: 'Metallic resistance increases with temperature; opening the key keeps the wire near ambient temperature.',
    },
  ],
  diode: [
    {
      question: 'What is the approximate forward knee (cut-in) voltage of a Silicon p-n junction diode?',
      options: ['0.1 V', '0.7 V', '2.5 V', '5.0 V'],
      correctIndex: 1,
      explanation: 'Silicon p-n diodes overcome the depletion barrier sharply around ~0.65–0.7 V.',
    },
    {
      question: 'What happens to the depletion layer width under reverse bias?',
      options: ['It disappears', 'It narrows', 'It widens and blocks majority carrier current', 'It turns metallic'],
      correctIndex: 2,
      explanation: 'Reverse bias pulls majority carriers away from the junction, widening the depletion zone.',
    },
    {
      question: 'In reverse bias (before breakdown), what carries the tiny micro-ampere current?',
      options: ['Majority carriers', 'Thermally generated minority carriers', 'Protons', 'Photoelectrons only'],
      correctIndex: 1,
      explanation: 'Reverse saturation current arises from thermally generated minority carriers.',
    },
  ],
  prism: [
    {
      question: 'At the angle of minimum deviation (δₘ) through a triangular prism, which condition holds?',
      options: [
        'Angle of incidence i equals angle of emergence e (i = e)',
        'i = 90°',
        'Refracted ray hits the base',
        'Angle of prism A = 0°',
      ],
      correctIndex: 0,
      explanation: 'Minimum deviation occurs symmetrically when the ray passes parallel to the prism base (i = e, r₁ = r₂ = A/2).',
    },
    {
      question: 'What is the shape of the i vs. δ curve for an equilateral glass prism?',
      options: [
        'Straight line through origin',
        'U-shaped curve showing a single distinct minimum δₘ',
        'Horizontal line',
        'Step function',
      ],
      correctIndex: 1,
      explanation: 'Deviation decreases with increasing i down to δₘ, then rises again symmetrically.',
    },
    {
      question: 'Which formula gives refractive index n of the prism material?',
      options: [
        'n = sin(A/2) / sin((A+δₘ)/2)',
        'n = sin((A + δₘ)/2) / sin(A/2)',
        'n = tan(A + δₘ)',
        'n = δₘ / A',
      ],
      correctIndex: 1,
      explanation: 'Snell’s law at minimum deviation yields n = sin((A + δₘ)/2) / sin(A/2).',
    },
  ],
  titration_oxalic: [
    {
      question: 'Why must a standard oxalic acid solution NOT be heated above 60–70 °C? Actually, in KMnO₄ titration, why is oxalic acid warmed to ~60 °C?',
      options: [
        'Because KMnO₄ is insoluble in cold water',
        'Because the redox reaction between MnO₄⁻ and C₂O₄²⁻ is slow at room temperature until autocatalyzed by Mn²⁺',
        'To boil off water',
        'To melt the conical flask',
      ],
      correctIndex: 1,
      explanation: 'Warming to ~60 °C overcomes initial activation energy before Mn²⁺ autocatalysis accelerates the reaction.',
    },
    {
      question: 'Why is no external indicator added in KMnO₄ titrations?',
      options: [
        'Phenolphthalein explodes with KMnO₄',
        'KMnO₄ acts as a self-indicator (deep purple MnO₄⁻ turns colorless Mn²⁺ until endpoint)',
        'Oxalic acid is bright pink',
        'It uses universal pH paper instead',
      ],
      correctIndex: 1,
      explanation: 'One excess drop of permanganate imparts a permanent pale-pink endpoint tint.',
    },
    {
      question: 'Which meniscus is read in a dark purple KMnO₄ burette?',
      options: ['Lower meniscus', 'Upper meniscus (since dark solution hides lower curve)', 'Middle average', 'Bottom of tap'],
      correctIndex: 1,
      explanation: 'Dark-colored KMnO₄ is opaque, so the upper tangent meniscus is read consistently.',
    },
  ],
  ph_tile: [
    {
      question: 'What color does universal pH indicator paper turn in strong acid (dilute HCl, pH ≈ 1–2)?',
      options: ['Deep Violet', 'Bright Red / Crimson', 'Emerald Green', 'Navy Blue'],
      correctIndex: 1,
      explanation: 'Universal indicator shifts to red at strongly acidic pH 1–2.',
    },
    {
      question: 'Pure distilled water at 25 °C has pH 7, turning universal indicator:',
      options: ['Green', 'Red', 'Purple', 'Orange'],
      correctIndex: 0,
      explanation: 'Neutral pH 7 corresponds to the green band on full-range universal indicator paper.',
    },
    {
      question: 'Why must you NOT dip the whole indicator paper strip directly into the reagent bottle?',
      options: [
        'It contaminates the stock solution with indicator dyes',
        'It dissolves the glass bottle',
        'Paper blocks light',
        'It increases molarity',
      ],
      correctIndex: 0,
      explanation: 'Always transfer a drop onto a clean spotting tile with a glass rod/dropper to keep stock solutions pure.',
    },
  ],
  kinetics_cross: [
    {
      question: 'What causes the "X" mark beneath the flask to vanish during the Na₂S₂O₃ + HCl reaction?',
      options: [
        'Precipitation of colloidal pale-yellow elemental sulfur (S)',
        'Formation of blue copper complex',
        'Condensation on the outside',
        'CO₂ bubbles only',
      ],
      correctIndex: 0,
      explanation: 'Na₂S₂O₃ + 2HCl → 2NaCl + H₂O + SO₂ + S↓; fine colloidal sulfur makes the solution opaque.',
    },
    {
      question: 'How is relative reaction rate computed from the cross-disappearance time t?',
      options: ['Rate ∝ t²', 'Rate ∝ 1 / t', 'Rate = t × 10', 'Rate is independent of t'],
      correctIndex: 1,
      explanation: 'For a fixed amount of sulfur needed to obscure the mark, average rate is proportional to 1/t.',
    },
    {
      question: 'Increasing concentration of Na₂S₂O₃ at constant temperature:',
      options: [
        'Increases collision frequency, shortening t and increasing rate 1/t',
        'Slows the reaction',
        'Halves sulfur mass',
        'Decreases rate',
      ],
      correctIndex: 0,
      explanation: 'Higher reactant concentration yields more effective collisions per second.',
    },
  ],
};

function inferExperimentVivas(exp: ExperimentConfig): PartialViva[] {
  const bankMatches = SUBMODE_VIVA_BANK[exp.subMode];
  const dynamicCore: PartialViva[] = [
    {
      question: `In "${exp.shortTitle}", which expression correctly relates the measured quantities?`,
      options: [
        exp.formulaLabel,
        'E = mc² (Mass-Energy Equivalence)',
        'PV = nRT (Ideal Gas Law only)',
        'F = G(m₁m₂)/r² (Universal Gravitation)',
      ],
      correctIndex: 0,
      explanation: `The governing relationship for this experiment is: ${exp.formulaLabel}.`,
    },
    {
      question: `Which unit is used to report the final verified result "${exp.resultLabel}"?`,
      options: [
        exp.resultUnit || 'dimensionless ratio',
        exp.resultUnit === 'cm' ? 'kg·m/s²' : 'mol·L⁻¹·K⁻¹',
        exp.resultUnit === '°C' ? 'Tesla (T)' : 'Kelvin·Ampere',
        'Weber/m²',
      ],
      correctIndex: 0,
      explanation: `${exp.resultLabel} is reported in ${exp.resultUnit || 'dimensionless units'}.`,
    },
  ];

  const disciplineBank: Record<string, PartialViva[]> = {
    Physics: [
      {
        question: 'Why should multiple trials or repeated readings be averaged in physics practicals?',
        options: [
          'To minimize random observational and parallax errors',
          'To change the apparatus least count',
          'To eliminate systematic zero error without correction',
          'To skip unit conversion',
        ],
        correctIndex: 0,
        explanation: 'Taking repeat trials reduces random scatter while systematic zero errors are corrected arithmetically.',
      },
      {
        question: 'What is parallax error when reading a scale or dial?',
        options: [
          'Apparent shift in reading when the eye is not aligned perpendicularly above the graduation mark',
          'Heat expansion of brass',
          'Battery voltage drop',
          'Air buoyancy',
        ],
        correctIndex: 0,
        explanation: 'Always view scale graduations and meniscus/needles straight-on (normal to the scale).',
      },
      {
        question: 'Before starting measurement with any calibrated instrument, what must you record first?',
        options: [
          'Least Count (LC) and Zero Error',
          'Room humidity only',
          'Mass of the wooden bench',
          'Time of day',
        ],
        correctIndex: 0,
        explanation: 'Knowing Least Count and Zero Error ensures accurate true readings.',
      },
    ],
    Chemistry: [
      {
        question: 'Why must glassware (burettes/pipettes) be rinsed with the solution they will hold after distilled-water washing?',
        options: [
          'To avoid dilution of the working solution by clinging water droplets',
          'To cool down the glass',
          'To neutralize all ions',
          'To remove graduations',
        ],
        correctIndex: 0,
        explanation: 'Residual distilled water would dilute the titrant/analyte concentration and skew results.',
      },
      {
        question: 'Which personal safety rule applies whenever heating a test tube over a Bunsen burner?',
        options: [
          'Point the open mouth away from yourself and neighbors while moving gently across the flame',
          'Hold the tube vertically without moving and look straight down into it',
          'Plug the mouth tightly with a rubber stopper while heating',
          'Heat empty dry glass on full blue flame continuously',
        ],
        correctIndex: 0,
        explanation: 'Pointing away and gentle agitation prevents sudden bumping ejection of hot liquid.',
      },
      {
        question: 'When reading a clear aqueous meniscus in a burette or measuring cylinder, align your eye with:',
        options: [
          'The bottom (lower tangent) of the concave meniscus',
          'The upper rim touching the glass wall',
          '2 mL above the surface',
          'The stopcock plug',
        ],
        correctIndex: 0,
        explanation: 'Clear liquids wet borosilicate glass, forming a concave meniscus whose lowest point marks true volume.',
      },
    ],
    Biology: [
      {
        question: 'Why is a drop of glycerine used when mounting temporary biological slides?',
        options: [
          'It prevents specimen dehydration/drying and clears optical refraction',
          'It dissolves cellulose cell walls',
          'It kills all pigments instantly',
          'It acts as an acid',
        ],
        correctIndex: 0,
        explanation: 'Glycerine keeps tissues hydrated and matches refractive index well without evaporating.',
      },
      {
        question: 'Why should ONLY the Fine Focus knob be adjusted after switching to 45× High Power or 100× Oil Immersion?',
        options: [
          'Working distance is tiny; Coarse Focus risks crashing the objective lens through the coverslip',
          'Fine focus increases light intensity',
          'Coarse focus rotates the eyepiece',
          'Fine focus changes the stain color',
        ],
        correctIndex: 0,
        explanation: 'High-power objectives sit fractions of a millimeter above the slide; coarse movement can shatter the slide.',
      },
      {
        question: 'How is total magnification of a compound microscope calculated?',
        options: [
          'Eyepiece magnification × Objective lens magnification',
          'Eyepiece + Objective',
          'Objective / Eyepiece',
          'Mirror angle × Diaphragm opening',
        ],
        correctIndex: 0,
        explanation: 'Total magnification equals the product of ocular (10×) and active objective (10×/45×/100×) powers.',
      },
    ],
  };

  // Pick 3 specific + 2 dynamic (always 5 unique questions)
  const specific = (bankMatches ?? disciplineBank[exp.discipline]).slice(0, 3);
  const combined = [...specific, ...dynamicCore];
  return combined.slice(0, 5);
}

export function getVivaQuestionsForExperiment(exp: ExperimentConfig): VivaQuestion[] {
  const items = inferExperimentVivas(exp);
  return items.map((item, idx) => ({
    id: `${exp.id}-viva-${idx + 1}`,
    ...item,
  }));
}
