import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { emitEvent } from '../../../utils/eventEmitter';
import { useTranslations } from '../../../hooks/useTranslations';
import { renderMathSR } from '../../../utils/mathA11y';

type QuizStep = {
  title?: string;
  narrative?: string;
  question?: string;
  options: string[];
  correct?: number; // index in options
  feedback?: string; // shown after correct
};

type QuizStepDef = {
  titleKey?: string;
  narrativeKey?: string;
  questionKey?: string;
  optionKeys: string[];
  correct?: number;
  feedbackKey?: string;
};

const QUIZ_STEPS_DEF: QuizStepDef[] = [
  {
    titleKey: 'pythagoreanTheorem.pyramidFinal.steps.1.title',
    narrativeKey: 'pythagoreanTheorem.pyramidFinal.steps.1.narrative',
    optionKeys: ['pythagoreanTheorem.pyramidFinal.ui.measure'],
  },
  {
    titleKey: 'pythagoreanTheorem.pyramidFinal.steps.2.title',
    narrativeKey: 'pythagoreanTheorem.pyramidFinal.steps.2.narrative',
    questionKey: 'pythagoreanTheorem.pyramidFinal.steps.2.question',
    optionKeys: [
      'pythagoreanTheorem.pyramidFinal.steps.2.options.option1',
      'pythagoreanTheorem.pyramidFinal.steps.2.options.option2',
      'pythagoreanTheorem.pyramidFinal.steps.2.options.option3',
    ],
    correct: 0,
    feedbackKey: 'pythagoreanTheorem.pyramidFinal.steps.2.feedback',
  },
  {
    titleKey: 'pythagoreanTheorem.pyramidFinal.steps.3.title',
    narrativeKey: 'pythagoreanTheorem.pyramidFinal.steps.3.narrative',
    questionKey: 'pythagoreanTheorem.pyramidFinal.steps.3.question',
    optionKeys: [
      'pythagoreanTheorem.pyramidFinal.steps.3.options.option1',
      'pythagoreanTheorem.pyramidFinal.steps.3.options.option2',
      'pythagoreanTheorem.pyramidFinal.steps.3.options.option3',
    ],
    correct: 0,
    feedbackKey: 'pythagoreanTheorem.pyramidFinal.steps.3.feedback',
  },
  {
    titleKey: 'pythagoreanTheorem.pyramidFinal.steps.4.title',
    narrativeKey: 'pythagoreanTheorem.pyramidFinal.steps.4.narrative',
    questionKey: 'pythagoreanTheorem.pyramidFinal.steps.4.question',
    optionKeys: [
      'pythagoreanTheorem.pyramidFinal.steps.4.options.option1',
      'pythagoreanTheorem.pyramidFinal.steps.4.options.option2',
      'pythagoreanTheorem.pyramidFinal.steps.4.options.option3',
    ],
    correct: 1,
    feedbackKey: 'pythagoreanTheorem.pyramidFinal.steps.4.feedback',
  },
  {
    titleKey: 'pythagoreanTheorem.pyramidFinal.steps.5.title',
    narrativeKey: 'pythagoreanTheorem.pyramidFinal.steps.5.narrative',
    questionKey: 'pythagoreanTheorem.pyramidFinal.steps.5.question',
    optionKeys: [
      'pythagoreanTheorem.pyramidFinal.steps.5.options.option1',
      'pythagoreanTheorem.pyramidFinal.steps.5.options.option2',
      'pythagoreanTheorem.pyramidFinal.steps.5.options.option3',
    ],
    correct: 2,
    feedbackKey: 'pythagoreanTheorem.pyramidFinal.steps.5.feedback',
  },
  {
    titleKey: 'pythagoreanTheorem.pyramidFinal.steps.6.title',
    narrativeKey: 'pythagoreanTheorem.pyramidFinal.steps.6.narrative',
    questionKey: 'pythagoreanTheorem.pyramidFinal.steps.6.question',
    optionKeys: [
      'pythagoreanTheorem.pyramidFinal.steps.6.options.option1',
      'pythagoreanTheorem.pyramidFinal.steps.6.options.option2',
      'pythagoreanTheorem.pyramidFinal.steps.6.options.option3',
    ],
    correct: 1,
    feedbackKey: 'pythagoreanTheorem.pyramidFinal.steps.6.feedback',
  },
  {
    titleKey: 'pythagoreanTheorem.pyramidFinal.steps.7.title',
    narrativeKey: 'pythagoreanTheorem.pyramidFinal.steps.7.narrative',
    questionKey: 'pythagoreanTheorem.pyramidFinal.steps.7.question',
    optionKeys: [
      'pythagoreanTheorem.pyramidFinal.steps.7.options.option1',
      'pythagoreanTheorem.pyramidFinal.steps.7.options.option2',
      'pythagoreanTheorem.pyramidFinal.steps.7.options.option3',
    ],
    correct: 0,
    feedbackKey: 'pythagoreanTheorem.pyramidFinal.steps.7.feedback',
  },
  {
    titleKey: 'pythagoreanTheorem.pyramidFinal.steps.8.title',
    narrativeKey: 'pythagoreanTheorem.pyramidFinal.steps.8.narrative',
    questionKey: 'pythagoreanTheorem.pyramidFinal.steps.8.question',
    optionKeys: [
      'pythagoreanTheorem.pyramidFinal.steps.8.options.option1',
      'pythagoreanTheorem.pyramidFinal.steps.8.options.option2',
      'pythagoreanTheorem.pyramidFinal.steps.8.options.option3',
    ],
    correct: 0,
    feedbackKey: 'pythagoreanTheorem.pyramidFinal.steps.8.feedback',
  },
  {
    titleKey: 'pythagoreanTheorem.pyramidFinal.steps.9.title',
    narrativeKey: 'pythagoreanTheorem.pyramidFinal.steps.9.narrative',
    questionKey: 'pythagoreanTheorem.pyramidFinal.steps.9.question',
    optionKeys: [
      'pythagoreanTheorem.pyramidFinal.steps.9.options.option1',
      'pythagoreanTheorem.pyramidFinal.steps.9.options.option2',
      'pythagoreanTheorem.pyramidFinal.steps.9.options.option3',
    ],
    correct: 0,
    feedbackKey: 'pythagoreanTheorem.pyramidFinal.steps.9.feedback',
  },
];

const TheFinalChallenge: React.FC = () => {
  const { t } = useTranslations();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const questionRef = useRef<HTMLParagraphElement | null>(null);
  const stepTitleRef = useRef<HTMLDivElement | null>(null);

  // Helper function to render text with proper square root notation
  const renderMathText = (text: string) => {
    // Helper: render occurrences of ² as visual ² + screen-reader " square"
    // and render minus characters as visual '-' + screen-reader " minus"
    return renderMathSR(text);
  };
  // Scene refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animReqRef = useRef<number | null>(null);

  // Dynamic groups
  const linesGroupRef = useRef<THREE.Group | null>(null);
  const labelsGroupRef = useRef<THREE.Group | null>(null);
  const pyramidRef = useRef<THREE.Mesh | null>(null);
  const pyramidWireframeRef = useRef<THREE.LineSegments | null>(null);
  const pyramidInteriorLinesRef = useRef<THREE.LineSegments | null>(null);

  // Constants derived from HTML
  const HALF_BASE = 205.5; // a (cubits)
  const HEIGHT = 274; // b (cubits)
  const SLANT_HEIGHT = 342.5; // c (cubits)
  const SCENE_HEIGHT = 420; // taller board to contain the scene
  const DIALOGUE_STEPS = 9; // 0..8 for navigation
  const PROGRESS_STEPS = 8; // 8 circles shown in progress bar

  // Model scale factor
  const MODEL_A = HALF_BASE / 100; // x length
  const MODEL_B = HEIGHT / 100; // y height

  // UI State
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  // Track completion state per step for progress UI
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(() => Array(PROGRESS_STEPS).fill(false));
  const announcementCountRef = useRef(0);
  const announceQuestion = (q: string) => {
    const announcer = document.getElementById('aria-announcer') || document.getElementById('final-challenge-announcer');
    if (!announcer) return;
    announcementCountRef.current += 1;
    announcer.textContent = '';
    setTimeout(() => {
      const invisibleSuffix = '\u200B'.repeat(announcementCountRef.current);
      announcer.textContent = q + invisibleSuffix;
    }, 50);
  };

  // View controls state
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [currentView, setCurrentView] = useState<'free' | 'side' | 'top' | 'front'>('free');
  // Whether the player has clicked Measure in step 1 (used to highlight the button)
  const [measured, setMeasured] = useState(false);
  
  // Keyboard control state
  const keyPressedRef = useRef<Set<string>>(new Set());

  // Key positions
  const POS = useMemo(() => {
    return {
      center: new THREE.Vector3(0, 0.02, 0),
      midpoint: new THREE.Vector3(MODEL_A, 0.02, 0),
      apex: new THREE.Vector3(0, MODEL_B, 0),
    };
  }, [MODEL_A, MODEL_B]);

  const clearGroup = (group: THREE.Group | null) => {
    if (!group) return;
    while (group.children.length) group.remove(group.children[0]);
  };

  const setViewPosition = useCallback(
    (view: 'free' | 'side' | 'top' | 'front') => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;

      const targetPos = new THREE.Vector3(0, MODEL_B / 2, 0);
      controls.target.copy(targetPos);

      switch (view) {
        case 'side':
          camera.position.set(0, MODEL_B / 2, 8);
          break;
        case 'top':
          // Adjust top view to be within zoom limits and prevent seeing below ground
          camera.position.set(0, MODEL_B + 4, 0.5);
          break;
        case 'front':
          camera.position.set(8, MODEL_B / 2, 0);
          break;
        case 'free':
        default:
          camera.position.set(4, MODEL_B * 1.2, 5);
          break;
      }

      controls.update();
    },
    [MODEL_B],
  );

  const handleViewChange = useCallback(
    (view: 'free' | 'side' | 'top' | 'front') => {
      setCurrentView(view);
      setViewPosition(view);
    },
    [setViewPosition],
  );

  // Keyboard controls for 3D pyramid
  const handlePyramidKeyDown = useCallback((e: React.KeyboardEvent) => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    const key = e.key;
    keyPressedRef.current.add(key);

    const rotationSpeed = 0.1;
    const zoomSpeed = 0.5;

    switch (key) {
      case 'ArrowLeft':
        e.preventDefault();
        // Rotate camera left around the target
        const posLeft = camera.position.clone().sub(controls.target);
        posLeft.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationSpeed);
        camera.position.copy(posLeft.add(controls.target));
        break;
      case 'ArrowRight':
        e.preventDefault();
        // Rotate camera right around the target
        const posRight = camera.position.clone().sub(controls.target);
        posRight.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed);
        camera.position.copy(posRight.add(controls.target));
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Rotate camera upward around the target
        const rightVectorUp = new THREE.Vector3()
          .subVectors(camera.position, controls.target)
          .cross(new THREE.Vector3(0, 1, 0))
          .normalize();
        const newPosUp = camera.position.clone().sub(controls.target);
        newPosUp.applyAxisAngle(rightVectorUp, rotationSpeed);
        camera.position.copy(newPosUp.add(controls.target));
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Rotate camera downward around the target
        const rightVectorDown = new THREE.Vector3()
          .subVectors(camera.position, controls.target)
          .cross(new THREE.Vector3(0, 1, 0))
          .normalize();
        const newPosDown = camera.position.clone().sub(controls.target);
        newPosDown.applyAxisAngle(rightVectorDown, -rotationSpeed);
        camera.position.copy(newPosDown.add(controls.target));
        break;
      case '+':
      case '=':
        e.preventDefault();
        // Zoom in
        const zoomInDir = new THREE.Vector3()
          .subVectors(controls.target, camera.position)
          .normalize()
          .multiplyScalar(zoomSpeed);
        const zoomInPos = camera.position.clone().add(zoomInDir);
        if (zoomInPos.distanceTo(controls.target) > controls.minDistance) {
          camera.position.copy(zoomInPos);
        }
        break;
      case '-':
      case '_':
        e.preventDefault();
        // Zoom out
        const zoomOutDir = new THREE.Vector3()
          .subVectors(camera.position, controls.target)
          .normalize()
          .multiplyScalar(zoomSpeed);
        const zoomOutPos = camera.position.clone().add(zoomOutDir);
        if (zoomOutPos.distanceTo(controls.target) < controls.maxDistance) {
          camera.position.copy(zoomOutPos);
        }
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        // Reset to current view
        setViewPosition(currentView);
        break;
    }
    controls.update();
  }, [currentView, setViewPosition]);

  const handlePyramidKeyUp = useCallback((e: React.KeyboardEvent) => {
    keyPressedRef.current.delete(e.key);
  }, []);

  // Removed 3D floating labels; legend now displays dynamic values

  const updateSceneForStep = useCallback(
    (stepIdx: number) => {
      const pyramid = pyramidRef.current;
      const linesGroup = linesGroupRef.current;
      const labelsGroup = labelsGroupRef.current;
      if (!pyramid || !linesGroup || !labelsGroup) return;

      clearGroup(linesGroup);
      // No longer using floating labels; legend handles values
      clearGroup(labelsGroup);

      // Colors and helpers (thick, solid lines with endpoint dots)
      const COLOR_A = 0xffe100; // a = Half base (yellow) per new visual style
      const COLOR_B = 0xff35da; // b = Height (magenta)
      const COLOR_C = 0x3afcff; // c = Slant height (cyan)

  const createThickLine = (start: THREE.Vector3, end: THREE.Vector3, color: number, radius = 0.045) => {
        const group = new THREE.Group();
        const dir = new THREE.Vector3().subVectors(end, start);
        const len = dir.length();
        if (len <= 0.0001) return group;

        // Black outline slightly bigger
        const outlineRadius = radius + 0.03;
        const outlineGeo = new THREE.CylinderGeometry(outlineRadius, outlineRadius, len, 16);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        // don't write outline to depth buffer so colored mesh renders cleanly on top
        (outlineMat as any).depthWrite = false;
        const outlineCyl = new THREE.Mesh(outlineGeo, outlineMat);
        const mid = start.clone().addScaledVector(dir, 0.5);
        outlineCyl.position.copy(mid);
        outlineCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        outlineCyl.renderOrder = 0;
        group.add(outlineCyl);

        // Colored cylinder on top
        const cylGeo = new THREE.CylinderGeometry(radius, radius, len, 16);
        const cylMat = new THREE.MeshBasicMaterial({ color });
        const cyl = new THREE.Mesh(cylGeo, cylMat);
        cyl.position.copy(mid);
        cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        // ensure colored cylinder renders after outline
        cyl.renderOrder = 1;
        group.add(cyl);

        // Outline dots (behind)
        const outlineDotGeo = new THREE.SphereGeometry(outlineRadius * 1.65, 20, 20);
        const outlineDotMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        (outlineDotMat as any).depthWrite = false;
        const sOutlineDot = new THREE.Mesh(outlineDotGeo, outlineDotMat);
        sOutlineDot.position.copy(start);
        const eOutlineDot = new THREE.Mesh(outlineDotGeo, outlineDotMat);
        eOutlineDot.position.copy(end);
        sOutlineDot.renderOrder = 0;
        eOutlineDot.renderOrder = 0;
        group.add(sOutlineDot, eOutlineDot);

        // Colored dots on top
        const dotGeo = new THREE.SphereGeometry(radius * 1.65, 20, 20);
        const dotMat = new THREE.MeshBasicMaterial({ color });
        const sDot = new THREE.Mesh(dotGeo, dotMat);
        sDot.position.copy(start);
        const eDot = new THREE.Mesh(dotGeo, dotMat);
        eDot.position.copy(end);
        sDot.renderOrder = 1;
        eDot.renderOrder = 1;
        group.add(sDot, eDot);

        return group;
      };

      // Create a dashed version of the thick line by composing short segments
      const createDashedThickLine = (
        start: THREE.Vector3,
        end: THREE.Vector3,
        color: number,
        radius = 0.045,
        dashLen = 0.12,
        gapRatio = 0.6,
      ) => {
        const group = new THREE.Group();
        const dir = new THREE.Vector3().subVectors(end, start);
        const len = dir.length();
        if (len <= 0.0001) return group;

        const unit = dir.clone().normalize();

        // compute number of dashes based on desired dash length and gap ratio
        const segmentFull = dashLen * (1 + gapRatio);
        let count = Math.max(1, Math.floor(len / segmentFull));
        // clamp so we don't create too many tiny segments
        count = Math.min(count, 60);
        const actualDash = len / (count * (1 + gapRatio));
        const gap = actualDash * gapRatio;

        const outlineRadius = radius + 0.03;

        for (let i = 0; i < count; i++) {
          const segStart = start.clone().addScaledVector(unit, i * (actualDash + gap));
          const segEnd = segStart.clone().addScaledVector(unit, actualDash);
          const segDir = new THREE.Vector3().subVectors(segEnd, segStart);
          const segLen = segDir.length();
          if (segLen <= 0.0001) continue;

          // outline segment
          const oGeo = new THREE.CylinderGeometry(outlineRadius, outlineRadius, segLen, 8);
          const oMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
          (oMat as any).depthWrite = false;
          const oMesh = new THREE.Mesh(oGeo, oMat);
          const mid = segStart.clone().addScaledVector(segDir, 0.5);
          oMesh.position.copy(mid);
          oMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), segDir.clone().normalize());
          oMesh.renderOrder = 0;
          group.add(oMesh);

          // colored segment on top
          const cGeo = new THREE.CylinderGeometry(radius, radius, segLen, 8);
          const cMat = new THREE.MeshBasicMaterial({ color });
          const cMesh = new THREE.Mesh(cGeo, cMat);
          cMesh.position.copy(mid);
          cMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), segDir.clone().normalize());
          cMesh.renderOrder = 1;
          group.add(cMesh);
        }

        // endpoint dots to match solid line style
        const outlineDotGeo = new THREE.SphereGeometry(outlineRadius * 1.65, 20, 20);
        const outlineDotMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        (outlineDotMat as any).depthWrite = false;
        const sOutlineDot = new THREE.Mesh(outlineDotGeo, outlineDotMat);
        sOutlineDot.position.copy(start);
        const eOutlineDot = new THREE.Mesh(outlineDotGeo, outlineDotMat);
        eOutlineDot.position.copy(end);
        sOutlineDot.renderOrder = 0;
        eOutlineDot.renderOrder = 0;
        group.add(sOutlineDot, eOutlineDot);

        const dotGeo = new THREE.SphereGeometry(radius * 1.65, 20, 20);
        const dotMat = new THREE.MeshBasicMaterial({ color });
        const sDot = new THREE.Mesh(dotGeo, dotMat);
        sDot.position.copy(start);
        const eDot = new THREE.Mesh(dotGeo, dotMat);
        eDot.position.copy(end);
        sDot.renderOrder = 1;
        eDot.renderOrder = 1;
        group.add(sDot, eDot);

        return group;
      };

      // Points
      const pCenter = POS.center;
      const pMid = POS.midpoint;
      const pApex = POS.apex;

      // Height line (b) - magenta thick solid
      const heightStart = new THREE.Vector3(0, 0.02, 0);
      const heightEnd = new THREE.Vector3(0, MODEL_B, 0);
      const heightLine = createThickLine(heightStart, heightEnd, COLOR_B);

      // Half base (a) - yellow thick solid
      const lineA = createThickLine(pCenter.clone(), pMid.clone(), COLOR_A);
      // Dashed version used for early explanatory step
      const dashedLineA = createDashedThickLine(pCenter.clone(), pMid.clone(), COLOR_A);

      // Hypotenuse (c) - cyan thick solid
      const lineC = createThickLine(pMid.clone(), pApex.clone(), COLOR_C);

      // Remove prior white dots in favor of colored endpoints from createThickLine

      // helper removed; call makeLabel inline

      // Base points aligned as in HTML (no rotation math for lines)
      const baseCorner = new THREE.Vector3(MODEL_A, 0.02, MODEL_A);
      const baseCornerOther = new THREE.Vector3(MODEL_A, 0.02, -MODEL_A);
      const baseMid = new THREE.Vector3(MODEL_A, 0.02, 0);
      const baseEdgeHalfLine = createThickLine(baseMid, baseCorner, COLOR_A);
      const baseEdgeFullLine = createThickLine(baseCornerOther, baseCorner, COLOR_A);

      // Pyramid opacity progression - made more transparent for better visibility
      const pMat = pyramid.material as THREE.MeshStandardMaterial;
      pMat.transparent = true;
      pMat.opacity = stepIdx >= 3 ? 0.15 : stepIdx >= 1 ? 0.4 : 1;

      // Control wireframe visibility
      const wireframe = pyramidWireframeRef.current;
      const interiorLines = pyramidInteriorLinesRef.current;

      if (wireframe) {
        // Show exterior wireframe outline in first step (when pyramid is opaque)
        wireframe.visible = stepIdx === 0;
      }

      if (interiorLines) {
        // Show all edges when pyramid becomes transparent (step 1 onwards)
        interiorLines.visible = stepIdx >= 1;
      }

      // Step-based drawing
      if (stepIdx === 0) {
        linesGroup.add(heightLine);
      } else if (stepIdx === 1) {
        linesGroup.add(heightLine, baseEdgeFullLine);
      } else if (stepIdx === 2) {
        linesGroup.add(heightLine, baseEdgeHalfLine, dashedLineA);
      } else if (stepIdx === 3) {
        linesGroup.add(heightLine, lineA);
      } else if (stepIdx === 4) {
        linesGroup.add(lineA, lineC);
      } else if (stepIdx >= 5) {
        const heightSolid = heightLine;
        linesGroup.add(lineA, lineC, heightSolid);
      }

      // Measurements toggle now controls line visibility (the thick colored lines)
      linesGroup.visible = showMeasurements;
    },
    [MODEL_B, POS, showMeasurements, t],
  );

  // Init Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      1000,
    );
      camera.position.set(0, MODEL_B / 2, 6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, Math.max(1, container.clientHeight));
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, Math.max(1, container.clientHeight));
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRendererRef.current = labelRenderer;
    container.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, labelRenderer.domElement);
    controls.target.set(0, MODEL_B / 2, 0);
    controls.enableDamping = true;

    // Set zoom limits to prevent infinite zoom in/out
    controls.minDistance = 3; // Minimum zoom distance
    controls.maxDistance = 15; // Maximum zoom distance

    // Limit vertical movement to prevent seeing below the ground
    controls.maxPolarAngle = Math.PI * 0.55; // Prevent camera from going below ground (135 degrees from top)
    controlsRef.current = controls;

    // Lights - enhanced for better contrast and visibility
    scene.add(new THREE.AmbientLight(0xffffff, 1.0)); // Increased ambient light
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0); // Increased directional light
    dirLight.position.set(8, 10, 5);
    scene.add(dirLight);

    // Add additional light from opposite side for better contrast
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight2.position.set(-8, 8, -5);
    scene.add(dirLight2);

  // Removed starry background to ensure the brown ground plane frames the 3D view

    // Pyramid
    const pyramidMaterial = new THREE.MeshStandardMaterial({
      color: 0xdbb481,
      roughness: 0.8,
      transparent: true,
      opacity: 1,
    });
    const pyramidGeometry = new THREE.ConeGeometry(MODEL_A * Math.sqrt(2), MODEL_B, 4);
    pyramidGeometry.translate(0, MODEL_B / 2, 0);
    const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
    pyramid.rotation.y = Math.PI / 4;
    scene.add(pyramid);
    pyramidRef.current = pyramid;

    // Pyramid wireframe for exterior outline - simple approach like in HTML
    const wireframeGeometry = new THREE.EdgesGeometry(pyramidGeometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 3,
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    pyramid.add(wireframe); // Add wireframe as child of pyramid
    pyramidWireframeRef.current = wireframe;

    // Pyramid all edges wireframe (for when transparent - shows all connecting lines)
    const allEdgesGeometry = new THREE.WireframeGeometry(pyramidGeometry);
    const allEdgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const allEdgesWireframe = new THREE.LineSegments(allEdgesGeometry, allEdgesMaterial);
    pyramid.add(allEdgesWireframe); // Add as child of pyramid like the main wireframe
    pyramidInteriorLinesRef.current = allEdgesWireframe;

    // Ground: light-brown platform plane under the pyramid
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x3d322c, roughness: 0.9 }),
    );
    ground.rotation.x = -Math.PI / 2;
    // keep ground close to zero so it shows around the edges of the viewport
    ground.position.y = -0.005;
    scene.add(ground);

    // Dynamic groups
    const linesGroup = new THREE.Group();
    const labelsGroup = new THREE.Group();
    scene.add(linesGroup);
    scene.add(labelsGroup);
    linesGroupRef.current = linesGroup;
    labelsGroupRef.current = labelsGroup;

    const onResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current || !labelRendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = Math.max(1, containerRef.current.clientHeight);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
      labelRendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      animReqRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // First draw
    updateSceneForStep(0);
    // Set initial view position
    setViewPosition('free');

    return () => {
      window.removeEventListener('resize', onResize);
      if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
      controls.dispose();
      renderer.dispose();
      labelRenderer.domElement.remove();
      renderer.domElement.remove();
      // Three will GC remaining objects with scene deref
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      labelRendererRef.current = null;
      controlsRef.current = null;
      linesGroupRef.current = null;
      labelsGroupRef.current = null;
      pyramidRef.current = null;
      pyramidWireframeRef.current = null;
      pyramidInteriorLinesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep scene in sync with labels toggle and step
  useEffect(() => {
    updateSceneForStep(currentStep);
    // reset transient UI selection state when step changes
  }, [currentStep, updateSceneForStep]);

  // Side panel removed
  // Sync with dialogues (first 9 dialogues control 9 interactive steps)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const questId = detail?.questId;
      // Accept common ids used for this quest
      if (questId !== 'final' && questId !== 'pyramidFinal' && questId !== 'finalChallenge') return;
      const idx = typeof detail?.dialogueIndex === 'number' ? detail.dialogueIndex : 0;
      const clamped = Math.max(0, Math.min(DIALOGUE_STEPS - 1, idx));
      setCurrentStep(clamped);
    };
    window.addEventListener('dialogue_progress', handler as EventListener);
    return () => window.removeEventListener('dialogue_progress', handler as EventListener);
  }, []);

  // Update scene when measurements toggle changes
  useEffect(() => {
    updateSceneForStep(currentStep);
  }, [showMeasurements, updateSceneForStep, currentStep]);

  // Reset UI state when step changes
  useEffect(() => {
    setSelectedAnswer(null);
    setIsCorrect(null);
  }, [currentStep]);

  const steps: QuizStep[] = React.useMemo(() => {
    return QUIZ_STEPS_DEF.map((s) => ({
      title: s.titleKey ? t(s.titleKey) : undefined,
      narrative: s.narrativeKey ? t(s.narrativeKey) : undefined,
      question: s.questionKey ? t(s.questionKey) : undefined,
      options: s.optionKeys.map((k) => t(k)),
      correct: s.correct,
      feedback: s.feedbackKey ? t(s.feedbackKey) : undefined,
    }));
  }, [t]);

  const step = steps[currentStep];
  const hasQuestion = !!step.question && typeof step.correct === 'number';

  // Focus management helper to keep focus inside this container
  const focusIntoPanel = useCallback(() => {
    if (questionRef.current) {
      questionRef.current.focus();
      return;
    }
    if (stepTitleRef.current) {
      stepTitleRef.current.focus();
      return;
    }
    if (containerRef.current) {
      (containerRef.current as unknown as HTMLElement).focus();
      return;
    }
    if (rootRef.current) {
      rootRef.current.focus();
    }
  }, []);

  // On step changes, first pull focus back inside panel, then announce question if present
  useEffect(() => {
    // Let DOM update, then focus inside the panel
    const id = window.setTimeout(() => {
      focusIntoPanel();
      if (hasQuestion && step.question) {
        // slight delay to ensure live region picks it up after focus change
        setTimeout(() => announceQuestion(step.question!), 50);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [currentStep, hasQuestion, step?.question, focusIntoPanel]);

  const onOptionClick = (idx: number) => {
    // Progress bar index maps dialogue steps (0..8) to dots (0..7)
    const progressIdx = currentStep - 1;
    // If step (mapped) is already completed, don't allow further interaction
    if (progressIdx >= 0 && completedSteps[progressIdx]) {
      return;
    }

    setSelectedAnswer(idx);

    if (!hasQuestion) {
      // Steps without questions: mark progress only if not the initial measure step
      if (progressIdx >= 0) {
        setCompletedSteps((prev) => {
          const next = [...prev];
          next[progressIdx] = true;
          return next;
        });
      }
      emitEvent(`final_challenge_step_${currentStep}_completed`, { step: currentStep + 1 });
      return;
    }

    const isCorrect = idx === step.correct;
    setIsCorrect(isCorrect);

    if (isCorrect) {
      // Announce "Correct" for screen readers
      announcementCountRef.current += 1;
      const announcer = document.getElementById('aria-announcer');
      if (announcer) {
        // Force change by clearing and setting with invisible character repeated
        announcer.textContent = '';
        setTimeout(() => {
          // Add zero-width spaces based on count to make content unique but invisible
          const invisibleSuffix = '\u200B'.repeat(announcementCountRef.current);
          announcer.textContent = `${t('common.correct')}${invisibleSuffix}`;
          console.log('Announcing CORRECT');
        }, 50);
      }
      
      // Mark corresponding progress dot
      if (progressIdx >= 0) {
        setCompletedSteps((prev) => {
          const next = [...prev];
          next[progressIdx] = true;
          return next;
        });
      }
      // Notify dialogue system; it will control progression
      emitEvent('final_challenge_question_answered', {
        step: currentStep + 1,
        correct: true,
      });
      emitEvent(`final_challenge_step_${currentStep}_completed`, {
        step: currentStep + 1,
        a: HALF_BASE,
        b: HEIGHT,
        c: SLANT_HEIGHT,
      });
    } else {
      // Announce "Incorrect" for screen readers
      announcementCountRef.current += 1;
      const announcer = document.getElementById('aria-announcer');
      if (announcer) {
        // Force change by clearing and setting with invisible character repeated
        announcer.textContent = '';
        setTimeout(() => {
          // Add zero-width spaces based on count to make content unique but invisible
          const invisibleSuffix = '\u200B'.repeat(announcementCountRef.current);
          announcer.textContent = `${t('common.incorrect')}${invisibleSuffix}`;
          console.log('Announcing INCORRECT');
        }, 50);
      }
      
      setTimeout(() => {
        setSelectedAnswer(null);
        setIsCorrect(null);
      }, 2000);
    }
  };

  return (
    <div
      className="absolute top-4 left-4 right-4 bottom-4 bg-[#1F1816] text-[#e0e1e6] p-6 overflow-y-auto"
      role="region"
      aria-label={t('pythagoreanTheorem.pyramidFinal.ui.hiddenTriangle') || 'Final Challenge'}
  ref={rootRef}
  tabIndex={-1}
    >
  {/* Local aria-live announcer as fallback if global announcer is absent */}
  <div id="final-challenge-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div className="flex flex-col" role="none">
        <div className="w-full">
          <div className="relative" style={{ height: SCENE_HEIGHT }} role="none">
            {/* Header moved to inside 3D board below */}
            {/* View Controls HUD moved to inside 3D board below */}

            {/* Show Measurements Toggle moved to end for correct focus order */}

            {/* Content row: 3D + side panel */}
            <div className={`flex w-full h-full pt-0 mb-0`} role="none">
              <div
                className="relative flex-1 overflow-hidden"
                style={{
                  backgroundImage: "url('assets/final/3d_board.png')",
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
              >
                {/* Step text and progress bar inside the 3D board */}
                <div
                  className="absolute top-2 left-2 right-2 h-12 bg-[#241911]/80 backdrop-blur-sm rounded flex items-center justify-between px-3 z-20"
                  role="none"
                >
                  <div
                    className="text-white text-lg font-semibold truncate"
                    role="heading"
                    aria-level={2}
                    tabIndex={-1}
                    ref={stepTitleRef}
                  >
                    {step.title ? renderMathSR(step.title) : ''}
                  </div>
                  <div 
                    className="flex items-center" 
                    role="group" 
                    aria-label={t('common.progressIndicator')}
                  >
                    {Array.from({ length: PROGRESS_STEPS }).map((_, i) => {
                      const stepStatus = completedSteps[i] 
                        ? t('common.correct')
                        : t('common.pending');
                      
                      return (
                        <React.Fragment key={i}>
                          <div className="relative">
                            <div
                              className={`w-5 h-5 rounded-full border border-[#FFC517] flex items-center justify-center ${
                                completedSteps[i] ? 'bg-[#FFC517]' : 'bg-black/50'
                              }`}
                              role="img"
                              aria-label={`${t('common.step')} ${i + 1}: ${stepStatus}`}
                            >
                              {completedSteps[i] && (
                                <img src="assets/check.png" alt="" className="w-4.5 h-4.5" aria-hidden="true" />
                              )}
                            </div>
                          </div>
                          {i < PROGRESS_STEPS - 1 && <div className="w-5 h-0.5 bg-[#FFC517]" aria-hidden="true"></div>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* View Controls HUD - moved inside 3D board */}
                <ul
                  className="absolute top-16 left-4 z-20 flex items-center gap-1"
                >
                  <li>
                    <button
                      onClick={() => handleViewChange('free')}
                      className="px-1.5 py-0.5 rounded text-[16px] font-medium transition-all flex items-center gap-1 bg-[#0F0B08] text-white hover:bg-[#1a1611]"
                      style={{
                        border: currentView === 'free' ? '1px solid #FFC517' : '1px solid #533A28',
                      }}
                    >
                      <span className="text-[16px]">🏛️</span>
                      <span className="text-[16px]">{t('pythagoreanTheorem.pyramidFinal.ui.freeView')}</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleViewChange('side')}
                      className="px-0.5 py-0.5 rounded text-[16px] font-medium transition-all flex items-center gap-1 bg-[#0F0B08] text-white hover:bg-[#1a1611]"
                      style={{
                        border: currentView === 'side' ? '1px solid #FFC517' : '1px solid #533A28',
                      }}
                    >
                      <span className="text-[16px]">📐</span>
                      <span className="text-[16px]">{t('pythagoreanTheorem.pyramidFinal.ui.sideView')}</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleViewChange('top')}
                      className="px-1.5 py-0.5 rounded text-[16px] font-medium transition-all flex items-center gap-1 bg-[#0F0B08] text-white hover:bg-[#1a1611]"
                      style={{
                        border: currentView === 'top' ? '1px solid #FFC517' : '1px solid #533A28',
                      }}
                    >
                      <span className="text-[16px]">⬜</span>
                      <span className="text-[16px]">{t('pythagoreanTheorem.pyramidFinal.ui.topView')}</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleViewChange('front')}
                      className="px-1.5 py-0.5 rounded text-[16px] font-medium transition-all flex items-center gap-1 bg-[#0F0B08] text-white hover:bg-[#1a1611]"
                      style={{
                        border: currentView === 'front' ? '1px solid #FFC517' : '1px solid #533A28',
                      }}
                    >
                      <span className="text-[16px]">👁️</span>
                      <span className="text-[16px]">{t('pythagoreanTheorem.pyramidFinal.ui.frontView')}</span>
                    </button>
                  </li>
                </ul>
                {/* Legend card below view buttons */}
                <div
                  className="absolute top-28 left-4 z-20 rounded-md px-4 py-3 text-sm"
                  style={{ backgroundColor: '#0F0B08', border: '2px solid #533A28', minWidth: 240 }}
                  tabIndex={0}
                  role="region"
                  aria-label={t('pythagoreanTheorem.pyramidFinal.ui.legend') || 'Legend'}
                >
                  <div className="flex items-center gap-3 py-1" role="none">
                    <span className="inline-block w-6 h-2 rounded" style={{ background: '#FF35DA' }} />
                    <span className="text-[#FF35DA] font-medium text-[16px]">b = Height</span>
                    <span className="ml-auto opacity-80 text-[#FF35DA]">
                      {currentStep >= 8 ? `(${HEIGHT})` : '( ? )'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 py-1" role="none">
                    <span className="inline-block w-6 h-2 rounded" style={{ background: '#FFE100' }} />
                    <span className="text-[#FFE100] font-medium text-[16px]">a = Half base</span>
                    <span className="ml-auto opacity-80 text-[#FFE100]">
                      {currentStep >= 2 ? `(${HALF_BASE})` : '( ? )'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 py-1" role="none">
                    <span className="inline-block w-6 h-2 rounded" style={{ background: '#3AFCFF' }} />
                    <span className="text-[#3AFCFF] font-medium text-[16px]">c = Slant height</span>
                    <span className="ml-auto opacity-80 text-[#3AFCFF]">
                      {currentStep >= 4 ? `(${SLANT_HEIGHT})` : '( ? )'}
                    </span>
                  </div>
                </div>
                <div 
                  className="absolute inset-5" 
                  ref={containerRef} 
                  role="region" 
                  aria-label={t('pythagoreanTheorem.pyramidFinal.ui.keyboardInstructions')}
                  tabIndex={0}
                  onKeyDown={handlePyramidKeyDown}
                  onKeyUp={handlePyramidKeyUp}
                />

                {/* Show Measurements Toggle - appears last in DOM for tab order */}
                <div className="absolute bottom-3 right-3 z-20">
                  <button
                    className="px-2 py-1 rounded text-[16px] font-medium transition-all flex items-center gap-1 bg-[#0F0B08] text-white hover:bg-[#1a1611]"
                    style={{ border: showMeasurements ? '1px solid #FFC517' : '1px solid #533A28' }}
                    onClick={() => setShowMeasurements(!showMeasurements)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowMeasurements(!showMeasurements);
                      }
                    }}
                    role="switch"
                    aria-checked={showMeasurements}
                    aria-label={t('pythagoreanTheorem.pyramidFinal.ui.showMeasurements')}
                  >
                    <span aria-hidden="true">
                      <img
                        src={showMeasurements ? 'assets/checkbox_checked.png' : 'assets/checkbox_unchecked.png'}
                        alt=""
                        className="w-4 h-4 inline-block mr-1"
                      />
                    </span>
                    <span className="text-[16px]">
                      {t('pythagoreanTheorem.pyramidFinal.ui.showMeasurements')}
                    </span>
                  </button>
                </div>
              </div>
              {/* Close container for w-full bg wrapper */}
            </div>
          </div>
        </div>

        {/* Step-specific instructions and controls */}
  <div className="mt-4 border-t border-[#333a55] pt-4 text-white" role="region" aria-label="Question panel">
          {/* Step 1 content */}
          {currentStep === 0 && (
            <div>
              <p className="text-white mb-1 text-center font-medium text-[22px] leading-[150%] tracking-[0%] align-middle">
                {t('pythagoreanTheorem.pyramidFinal.ui.explore')}
              </p>
              <p className="text-white text-center font-medium text-[18px] leading-[150%] tracking-[0%] align-middle mb-15">
                {t('pythagoreanTheorem.pyramidFinal.ui.rotateZoom')}
              </p>
              {measured && (
                <p className="text-[#FFE100] -mt-6 text-center font-medium text-[22px] leading-[150%] tracking-[0%] align-middle">
                  {t('pythagoreanTheorem.pyramidFinal.ui.baseMsg')}
                </p>
              )}
              <p className="text-white mb-3 text-center font-medium text-[18px] leading-[150%] tracking-[0%] align-middle">
                {t('pythagoreanTheorem.pyramidFinal.ui.clickMeasure')}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setMeasured(true);
                    emitEvent('final_challenge_started', {
                      a: HALF_BASE,
                      b: HEIGHT,
                      c: SLANT_HEIGHT,
                    });
                  }}
                  className="px-4 py-2 rounded"
                  style={{ width: '25%', border: '1px solid #533A28', backgroundColor: '#0F0B08', color: '#ffffff' }}
                >
                  {t('pythagoreanTheorem.pyramidFinal.ui.measure')}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 content */}
          {currentStep === 1 && (
            <div>
              <p id="final-challenge-question-step2" className="mb-3 text-center font-medium text-[18px] leading-[150%] tracking-[0%] align-middle">
                {t('pythagoreanTheorem.pyramidFinal.steps.2.question')}
              </p>

              {/* Ladder-style options UI */}
              <div className="flex justify-center">
                <div className="relative w-[650px]">
                  <div role="group" aria-labelledby="final-challenge-question-step2" className="space-y-2 max-w-lg mx-auto flex flex-col items-center">
                    {[
                      { text: t('pythagoreanTheorem.pyramidFinal.steps.2.options.option1'), correct: true },
                      { text: t('pythagoreanTheorem.pyramidFinal.steps.2.options.option2'), correct: false },
                      { text: t('pythagoreanTheorem.pyramidFinal.steps.2.options.option3'), correct: false },
                    ].map((opt, idx) => {
                      // emulate ladder style: border green on correct, red on incorrect after click
                      const onClick = () => {
                        // Delegate to shared handler; this will set selectedIdx, feedback, mark completion, and emit events
                        onOptionClick(idx);
                      };
                      const isStepCompleted = completedSteps[Math.max(0, currentStep - 1)];
                      const isSelected = selectedAnswer === idx;
                      const showResult = isSelected && isCorrect !== null;

                      // If step is completed, only show correct answer with check
                      const shouldShowCorrect = (isStepCompleted && opt.correct) || (showResult && isCorrect);
                      const shouldShowIncorrect = showResult && !isCorrect;

                      const borderColor = shouldShowCorrect
                        ? '#00FF08'
                        : shouldShowIncorrect
                        ? '#FF3B3A'
                        : '#533A28';
                      return (
                        <button
                          key={idx}
                          onClick={onClick}
                          className={`w-[85%] mx-auto p-2 rounded-md text-left transition-all flex items-center space-x-3 relative z-10`}
                          style={{ backgroundColor: '#0F0B08', borderColor, borderWidth: 1, borderStyle: 'solid' }}
                        >
                          <div className="w-6 h-6 rounded-full border-2 border-[#FFB700] flex items-center justify-center flex-shrink-0">
                            {shouldShowCorrect && (
                              <img src="assets/check.png" alt={t('common.checkmarkAlt')} className="w-5 h-5" />
                            )}
                            {shouldShowIncorrect && (
                              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span className="text-white text-base">{renderMathText(opt.text)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-center" />
            </div>
          )}

          {/* Default content for other steps */}
          {currentStep !== 0 && currentStep !== 1 && (
            <div>
              {/* Removed extra italic narrative text as requested */}
        {step.question && (
                <p
                  id={`final-challenge-question-step${currentStep}`}
                  ref={questionRef}
                  tabIndex={-1}
                  className="mb-3 text-center font-medium text-[18px] leading-[150%] tracking-[0%] align-middle"
                >
          {renderMathSR(step.question)}
                </p>
              )}
              {hasQuestion ? (
                <div className="flex justify-center mt-3">
                  <div className="relative w-[650px]">
                    <div role="group" aria-labelledby={`final-challenge-question-step${currentStep}`} className="space-y-2 max-w-lg mx-auto flex flex-col items-center">
                      {step.options.map((opt, i) => {
                        const isStepCompleted = completedSteps[Math.max(0, currentStep - 1)];
                        const isSelected = selectedAnswer === i;
                        const showResult = isSelected && isCorrect !== null;
                        const isCorrectOption = i === step.correct;

                        // If step is completed, only show correct answer with check
                        const shouldShowCorrect =
                          (isStepCompleted && isCorrectOption) || (showResult && isCorrect);
                        const shouldShowIncorrect = showResult && !isCorrect;

                        const borderColor = shouldShowCorrect
                          ? '#00FF08'
                          : shouldShowIncorrect
                          ? '#FF3B3A'
                          : '#533A28';
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              onOptionClick(i);
                            }}
                            className={`w-[85%] mx-auto p-2 rounded-md text-left transition-all flex items-center space-x-3 relative z-10`}
                            style={{
                              backgroundColor: '#0F0B08',
                              borderColor,
                              borderWidth: 1,
                              borderStyle: 'solid',
                            }}
                          >
                            <div className="w-6 h-6 rounded-full border-2 border-[#FFB700] flex items-center justify-center flex-shrink-0">
                              {shouldShowCorrect && (
                                <img src="assets/check.png" alt={t('common.checkmarkAlt')} className="w-5 h-5" />
                              )}
                              {shouldShowIncorrect && (
                                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span className="text-white text-base">{renderMathText(opt)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 mt-3">
                  {step.options.map((opt, i) => (
                    <button key={i} onClick={() => onOptionClick(i)} className="btn-interactive w-full max-w-xl">
                      {renderMathText(opt)}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheFinalChallenge;
