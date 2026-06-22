// --- Basic Setup ---
        let scene, camera, renderer;
        let playerVelocity, playerOnFloor;
        const playerHeight = 1.8;
        const playerCrouchHeight = 1.0;
        const playerRadius = 0.5;
        let isCrouching = false;
        
        const moveSpeed = 5.0;
        const crouchSpeed = 2.5;
        const keys = {};
        let languageMode = localStorage.getItem('languageMode') || 'zh';
        const warmupTargetSettings = {
            moving: localStorage.getItem('warmupTargetMoving') === 'true',
            speed: parseFloat(localStorage.getItem('warmupTargetSpeed') || '1.5')
        };
        const CUSTOM_STAGE_ID = 'custom:local';
        const DEFAULT_WALL_COLOR = '#ff00f5';
        const DEFAULT_FLOOR_COLOR = '#5cff72';
        const WALL_MATERIAL_MODES = { PALETTE: 'palette', COLOR: 'color', IMAGE: 'image' };
        const FLOOR_MATERIAL_MODES = { COLOR: 'color', IMAGE: 'image' };
        const storedEditorWallMode = localStorage.getItem('editorWallMode');
        const storedEditorFloorMode = localStorage.getItem('editorFloorMode');
        const editorTextureSettings = {
            wallMode: ['palette', 'color', 'image'].includes(storedEditorWallMode)
                ? storedEditorWallMode
                : (localStorage.getItem('editorWallImage') ? WALL_MATERIAL_MODES.IMAGE : WALL_MATERIAL_MODES.PALETTE),
            floorMode: ['color', 'image'].includes(storedEditorFloorMode)
                ? storedEditorFloorMode
                : (localStorage.getItem('editorFloorImage') ? FLOOR_MATERIAL_MODES.IMAGE : FLOOR_MATERIAL_MODES.COLOR),
            wallImage: localStorage.getItem('editorWallImage') || '',
            floorImage: localStorage.getItem('editorFloorImage') || '',
            wallColor: localStorage.getItem('editorWallColor') || DEFAULT_WALL_COLOR,
            floorColor: localStorage.getItem('editorFloorColor') || DEFAULT_FLOOR_COLOR,
            wallTextureSize: parseFloat(localStorage.getItem('editorWallTextureSize') || '1'),
            floorTextureSize: parseFloat(localStorage.getItem('editorFloorTextureSize') || '1'),
            selectedStage: parseInt(localStorage.getItem('editorSelectedStage') || '0', 10),
            active: false
        };
        let editorWallTexture = null;
        let editorFloorTexture = null;
        let editorTool = 'wall';
        let customLevelData = null;

        // Map arrow keys to WASD movement
        document.addEventListener('keydown', function(event) {
            if (event.code === 'ArrowUp') keys['KeyW'] = true;
            if (event.code === 'ArrowLeft') keys['KeyA'] = true;
            if (event.code === 'ArrowDown') keys['KeyS'] = true;
            if (event.code === 'ArrowRight') keys['KeyD'] = true;
        });
        document.addEventListener('keyup', function(event) {
            if (event.code === 'ArrowUp') keys['KeyW'] = false;
            if (event.code === 'ArrowLeft') keys['KeyA'] = false;
            if (event.code === 'ArrowDown') keys['KeyS'] = false;
            if (event.code === 'ArrowRight') keys['KeyD'] = false;
        });

        const clock = new THREE.Clock();
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        const PI_2 = Math.PI / 2;

        const gravity = 30.0;
        const jumpForce = 10.0;
        
        // --- Game Logic Variables ---
        let currentStage = -1;
        let gameMode = '';
        let unlockedLevel = 1;
        let levelTimes = {};
        let canPlayerMove = true;
        let hasPlayerMoved = false;

        // --- Player Combat Variables ---
        let playerHealth = 3;
        let maxPlayerHealth = 3;
        let isPlayerDead = false;

        // --- Reward System Variables ---
        let playerProfile = { nickname: '', title: '', en_title: '' };
        let levelStars = {};
        let starTimeThresholds = {
            1: { s3: 5,   s2: 10 },   // Attention: Point Focus
            2: { s3: 50,  s2: 60 },   // Reaction: Quick Response (Adjusted)
            3: { s3: 70,  s2: 80 },   // Processing: Dynamic Tracking (Adjusted)
            4: { s3: 70,  s2: 80 },   // Prediction: Trajectory Forecast (Adjusted)
            5: { s3: 40,  s2: 60 },   // Coordination: Synchronized Tasks
            6: { s3: 20,  s2: 30 },   // Spatial Planning: Blueprint Navigation (Adjusted)
            7: { s3: 15,  s2: 20 },   // Motor Skills: Rhythmic Leap (Adjusted)
            8: { s3: 20,  s2: 25 },   // Cognitive Flexibility: Task Switching (Adjusted)
            9: { s3: 25,  s2: 40 },   // Working Memory: Maze Sprint I (Adjusted)
            10: { s3: 40, s2: 60 },   // Working Memory: Maze Sprint II (Adjusted)
            11: { s3: 60, s2: 80 },   // Working Memory: Maze Sprint III (Adjusted)
            12: { s3: 80, s2: 110 },  // Working Memory: Maze Sprint IV (Adjusted)
            13: { s3: 30, s2: 45 },   // Strategic Thinking: Dynamic Chase I
            14: { s3: 45, s2: 60 },   // Strategic Thinking: Dynamic Chase II
            15: { s3: 60, s2: 75 },   // Strategic Thinking: Dynamic Chase III
            16: { s3: 40, s2: 55 },   // Sequential Memory: Landmark Trace I (Adjusted)
            17: { s3: 50, s2: 65 },   // Sequential Memory: Landmark Trace II (Adjusted)
            18: { s3: 70, s2: 90 },   // Sequential Memory: Landmark Trace III (Adjusted)
            19: { s3: 80, s2: 100 },  // Sequential Memory: Landmark Trace IV (Adjusted)
            20: { s3: 90, s2: 120 },  // Sequential Memory: Landmark Trace V (Adjusted)
            21: { s3: 100, s2: 130 }, // Sequential Memory: Landmark Trace VI (Adjusted)
            22: { s3: 60, s2: 80 },   // Risk & Decision: Hazard Breakout I (Adjusted)
            23: { s3: 80, s2: 110 },  // Risk & Decision: Hazard Breakout II (Adjusted)
            24: { s3: 100, s2: 140 }, // Risk & Decision: Hazard Breakout III (Adjusted)
            25: { s3: 120, s2: 160 }, // Risk & Decision: Hazard Breakout IV (Adjusted)
            26: { s3: 150, s2: 200 }, // Risk & Decision: Hazard Breakout V (Adjusted)
        };
        const TOTAL_LEVELS = 27;

        // --- UI Elements ---
        let instructionElement, blockerElement, crosshairElement, npcCounterElement, landmarkCounterElement, genericCounterElement, mapUsesCounterElement;
        let menuOverlay, levelSelectMenu, modeSelectionScreen, playerInfoElement;
        let keyDisplay, keyW, keyA, keyS, keyD, keySpace, keyShift;
        let narrationBox, resultsOverlay, trainingChoiceOverlay, trainingCommandElement, resetConfirmOverlay;
        let warmupConfirmOverlay; 
        let warmupTargetSettingsPanel, warmupTargetMovingInput, warmupTargetSpeedInput, warmupTargetSpeedValue;
        let editorPanel, editorLevelSelect, editorWallInput, editorFloorInput, editorStatusElement;
        let editorWallModeSelect, editorFloorModeSelect;
        let editorWallColorInput, editorFloorColorInput, editorWallSizeInput, editorFloorSizeInput;
        let editorWallSizeValue, editorFloorSizeValue;
        let editorGridCanvas, editorCustomNameInput, editorSaveCustomButton, editorPlayCustomButton;
        let editorMinimapSizeInput, editorMinimapSizeValue;
        let editorApplyButton, editorResetButton, editorMainMenuButton;
        let healthContainer, healthBar, healthText;

        // --- Stage Specific Variables ---
        let stageObjects = [];
        let collidables = [];
        let animatedObjects = [];
        let npcs = [];
        let landmarks = [];
        let turrets = [];
        let nextLandmarkIndex = 0;
        const raycaster = new THREE.Raycaster();
        const centerScreen = new THREE.Vector2(0, 0);
        let stage1Targets = [];
        let aimedTargets = new Set();
        let stageCompletionFlag = false; 
        let isTransitioning = false;
        let resumeRequested = false;
		let resumeArm = false;
		let highlightedRing = null;
        
        let shuttleRunState = {};
        let shuttleRunMaterials = {};
        let trailParticles = []; 

        let corridorState = {};
        let corridorTargets = [];
        let activatedCorridorTargets = new Set();

        let wasdTrainingKeys = [];
        let wasdCenterButton = null;
        let wasdTrainingActivated = false;
        let wasdTrainingMode = null; 
        let currentTrainingKey = null; 
        let isWaitingForNextCommand = false;

        let toyGun;
        let bullets = [];
        let bulletHoles = [];
        let shootCooldown = 0;

        let levelStartTime = 0;
        let timePausedAt = 0;
        let isTimerRunning = false;
        let timerElement;
        let minimapContainer, minimap, minimapCtx;
        let firework3DParticles = [];
        let fireworksInterval = null;
        let minimapUsesLeft = 8; 
        
        let warmupCountdownInterval = null;
        let warmupTimerDisplayElement;

        let stonePathTexture, metallicPatternFloorTexture, shuttleRunStoneTexture, shuttleRunMetalTexture;
        let shuttleRunFloorTexture, missionCorridorFloorTexture;

        window.onload = function() {
            init();
        };

        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87ceeb);
            scene.fog = new THREE.Fog(0x87ceeb, 0, 150);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.y = playerHeight;

            createToyGun();
            camera.add(toyGun);
            scene.add(camera);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            document.body.appendChild(renderer.domElement);
            
            instructionElement = document.getElementById('instructions');
            blockerElement = document.getElementById('blocker');
            crosshairElement = document.getElementById('crosshair');
            npcCounterElement = document.getElementById('npc-counter');
            landmarkCounterElement = document.getElementById('landmark-counter');
            genericCounterElement = document.getElementById('generic-counter');
            mapUsesCounterElement = document.getElementById('map-uses-counter'); 
            menuOverlay = document.getElementById('menu-overlay');
            levelSelectMenu = document.getElementById('level-select-menu');
            modeSelectionScreen = document.getElementById('mode-selection');
            playerInfoElement = document.getElementById('player-info');
            keyDisplay = document.getElementById('key-display');
            keyW = document.getElementById('key-w');
            keyA = document.getElementById('key-a');
            keyS = document.getElementById('key-s');
            keyD = document.getElementById('key-d');
            keySpace = document.getElementById('key-space');
            keyShift = document.getElementById('key-shift');
            timerElement = document.getElementById('timer');
            minimapContainer = document.getElementById('minimap-container');
            minimap = document.getElementById('minimap');
            minimap.width = 200;
            minimap.height = 200;
            minimapCtx = minimap.getContext('2d');
            narrationBox = document.getElementById('narration-box');
            resultsOverlay = document.getElementById('results-overlay');
            trainingChoiceOverlay = document.getElementById('training-choice-overlay');
            trainingCommandElement = document.getElementById('training-command');
            resetConfirmOverlay = document.getElementById('reset-confirm-overlay');
            warmupConfirmOverlay = document.getElementById('warmup-confirm-overlay');
            warmupTimerDisplayElement = document.getElementById('warmup-timer-display');
            warmupTargetSettingsPanel = document.getElementById('warmup-target-settings');
            warmupTargetMovingInput = document.getElementById('warmup-target-moving');
            warmupTargetSpeedInput = document.getElementById('warmup-target-speed');
            warmupTargetSpeedValue = document.getElementById('warmup-target-speed-value');
            editorPanel = document.getElementById('editor-panel');
            editorLevelSelect = document.getElementById('editor-level-select');
            editorWallModeSelect = document.getElementById('editor-wall-material-mode');
            editorFloorModeSelect = document.getElementById('editor-floor-material-mode');
            editorWallInput = document.getElementById('editor-wall-image');
            editorFloorInput = document.getElementById('editor-floor-image');
            editorWallColorInput = document.getElementById('editor-wall-color');
            editorFloorColorInput = document.getElementById('editor-floor-color');
            editorWallSizeInput = document.getElementById('editor-wall-texture-size');
            editorFloorSizeInput = document.getElementById('editor-floor-texture-size');
            editorWallSizeValue = document.getElementById('editor-wall-size-value');
            editorFloorSizeValue = document.getElementById('editor-floor-size-value');
            editorGridCanvas = document.getElementById('editor-grid-canvas');
            editorCustomNameInput = document.getElementById('editor-custom-name');
            editorSaveCustomButton = document.getElementById('editor-save-custom-button');
            editorPlayCustomButton = document.getElementById('editor-play-custom-button');
            editorMinimapSizeInput = document.getElementById('editor-minimap-size');
            editorMinimapSizeValue = document.getElementById('editor-minimap-size-value');
            editorStatusElement = document.getElementById('editor-status');
            editorApplyButton = document.getElementById('editor-apply-button');
            editorResetButton = document.getElementById('editor-reset-button');
            editorMainMenuButton = document.getElementById('editor-main-menu-button');
            healthContainer = document.getElementById('player-health-container');
            healthBar = document.getElementById('player-health-bar');
            healthText = document.getElementById('player-health-text');

            playerVelocity = new THREE.Vector3();

            createTexturesAndMaterials();
            setupModeSelection();
            setupMenu();
            setupResultsScreen();
            setupTrainingChoice();
            setupResetConfirmation();
            setupWarmupConfirmation(); 
            setupLanguageControls();
            setupWarmupTargetSettings();
            setupEditorControls();
            applyLanguage();
            document.addEventListener('pointerlockchange', onPointerlockChange, false);
            document.addEventListener('pointerlockerror', onPointerlockError, false);
            document.addEventListener('keydown', onKeyDown, false);
            document.addEventListener('keyup', onKeyUp, false);
            window.addEventListener('resize', onWindowResize);
            document.addEventListener('mousedown', onMouseDown, false);

            animate();
        }

        const STATIC_I18N = [
            { selector: '#mode-selection h1', zh: '选择训练模式', en: 'Select Mode' },
            { selector: '#mode-language-label', zh: '语言', en: 'Language' },
            { selector: '#menu-language-label', zh: '语言', en: 'Language' },
            { selector: '#campaign-mode-button', zh: '生涯模式', en: 'Campaign Mode' },
            { selector: '#free-mode-button', zh: '自由模式', en: 'Free Mode' },
            { selector: '#editor-mode-button', zh: '编辑器模式', en: 'Editor Mode' },
            { selector: '#profile-form h2', zh: '创建您的档案', en: 'Create Your Profile' },
            { selector: '#nickname-input', attr: 'placeholder', zh: '请输入您的昵称', en: 'Enter Nickname' },
            { selector: '#male-button', zh: '我是叔叔', en: 'I am Uncle' },
            { selector: '#female-button', zh: '我是阿姨', en: 'I am Auntie' },
            { selector: '#start-campaign-button', zh: '开始训练', en: 'Start Training' },
            { selector: '#results-title', zh: '能力认证', en: 'Cognitive Mastery' },
            { selector: '#close-results-button', zh: '太棒了！返回菜单', en: 'Awesome! Back to Menu' },
            { selector: '#training-choice-box h2', zh: '移动特训', en: 'Movement Special Training' },
            { selector: '#training-choice-box p', zh: '您想开始带有指令的移动特训吗？', en: 'Would you like to start special training with commands?' },
            { selector: '#training-yes', zh: '是', en: 'Yes' },
            { selector: '#training-no', zh: '否', en: 'No' },
            { selector: '#reset-confirm-box h2', zh: '重置档案？', en: 'Reset Profile?' },
            { selector: '#reset-confirm-box p', zh: '您确定要清除所有训练记录吗？此操作无法撤销。', en: 'Are you sure you want to erase all progress? This action cannot be undone.' },
            { selector: '#reset-confirm-yes', zh: '确定', en: 'Confirm' },
            { selector: '#reset-confirm-no', zh: '取消', en: 'Cancel' },
            { selector: '#warmup-confirm-box h2', zh: '开始训练？', en: 'Start Training?' },
            { selector: '#warmup-confirm-box p', zh: '热身结束！准备好开始第一项认知训练了吗？', en: 'Warm-up complete! Are you ready to start the first cognitive training?' },
            { selector: '#warmup-confirm-yes', zh: '准备好了', en: 'Yes' },
            { selector: '#warmup-confirm-no', zh: '再等等', en: 'Not Yet' },
            { selector: '#resume-button', zh: '继续训练', en: 'Resume' },
            { selector: '#restart-button', zh: '重新开始', en: 'Restart' },
            { selector: '#select-level-button', zh: '选择关卡', en: 'Select Level' },
            { selector: '#warmup-button', zh: '返回热身', en: 'Warm-up' },
            { selector: '#main-menu-button', zh: '返回主菜单', en: 'Main Menu' },
            { selector: '#reset-game-button', zh: '重置档案', en: 'Reset Profile' },
            { selector: '#warmup-target-title', zh: '热身靶子设置', en: 'Warm-up Target' },
            { selector: '#warmup-target-moving-label', zh: '靶子移动', en: 'Moving target' },
            { selector: '#warmup-target-speed-label', zh: '移动速度', en: 'Speed' },
            { selector: '#editor-panel-title', zh: '编辑器模式', en: 'Editor Mode' },
            { selector: '#editor-level-label', zh: '关卡', en: 'Level' },
            { selector: '#editor-wall-mode-label', zh: '墙体材质模式', en: 'Wall Material Mode' },
            { selector: '#editor-floor-mode-label', zh: '地面材质模式', en: 'Floor Material Mode' },
            { selector: '#editor-wall-label', zh: '墙体图片', en: 'Wall Image' },
            { selector: '#editor-floor-label', zh: '地面图片', en: 'Floor Image' },
            { selector: '#editor-wall-color-label', zh: '墙体配色', en: 'Wall Color' },
            { selector: '#editor-floor-color-label', zh: '地面配色', en: 'Floor Color' },
            { selector: '#editor-wall-size-label', zh: '墙体图片大小', en: 'Wall Image Size' },
            { selector: '#editor-floor-size-label', zh: '地面图片大小', en: 'Floor Image Size' },
            { selector: '#editor-custom-title', zh: '自定义关卡', en: 'Custom Level' },
            { selector: '#editor-custom-name-label', zh: '名称', en: 'Name' },
            { selector: '#editor-tool-label', zh: '画笔', en: 'Brush' },
            { selector: '#editor-goal-label', zh: '游戏目标', en: 'Goals' },
            { selector: '#editor-goal-reach-label', zh: '抵达终点', en: 'Reach goal' },
            { selector: '#editor-goal-landmarks-label', zh: '路标模式', en: 'Landmarks' },
            { selector: '#editor-goal-npc-label', zh: 'NPC触及模式', en: 'Catch NPCs' },
            { selector: '#editor-goal-annihilation-label', zh: '歼灭模式', en: 'Annihilation' },
            { selector: '#editor-minimap-label', zh: '小地图', en: 'Minimap' },
            { selector: '#editor-minimap-enabled-label', zh: '启用小地图', en: 'Enable minimap' },
            { selector: '#editor-minimap-centered-label', zh: '玩家居中', en: 'Player centered' },
            { selector: '#editor-minimap-rotate-label', zh: '随玩家旋转', en: 'Rotate with player' },
            { selector: '#editor-minimap-click-hide-label', zh: '点击隐藏', en: 'Click to hide' },
            { selector: '#editor-minimap-static-e-label', zh: '按E显示', en: 'Static, press E' },
            { selector: '#editor-minimap-size-label', zh: '小地图大小', en: 'Minimap Size' },
            { selector: '#editor-save-custom-button', zh: '保存关卡', en: 'Save Level' },
            { selector: '#editor-play-custom-button', zh: '试玩', en: 'Play' },
            { selector: '#editor-apply-button', zh: '应用', en: 'Apply' },
            { selector: '#editor-reset-button', zh: '重置', en: 'Reset' },
            { selector: '#editor-main-menu-button', zh: '主菜单', en: 'Main Menu' },
            { selector: '#key-space', zh: '空格', en: 'Space' }
        ];

        function t(zh, en) {
            return languageMode === 'en' ? en : zh;
        }

        function setupLanguageControls() {
            document.querySelectorAll('.language-option').forEach(button => {
                button.addEventListener('click', () => {
                    setLanguageMode(button.dataset.language === 'en' ? 'en' : 'zh');
                });
            });
        }

        function setLanguageMode(mode) {
            languageMode = mode === 'en' ? 'en' : 'zh';
            localStorage.setItem('languageMode', languageMode);
            applyLanguage();
            updateLevelSelectMenu();
            updatePlayerInfoUI();
            updateInstructions();
            updateCurrentCounters();
        }

        function applyLanguage() {
            document.documentElement.lang = languageMode === 'en' ? 'en' : 'zh';
            STATIC_I18N.forEach(item => {
                const element = document.querySelector(item.selector);
                if (!element) return;
                const value = t(item.zh, item.en);
                if (item.attr) {
                    element.setAttribute(item.attr, value);
                } else {
                    element.innerHTML = value;
                }
            });
            document.querySelectorAll('.language-option').forEach(button => {
                button.classList.toggle('active', button.dataset.language === languageMode);
            });
            updateWarmupTargetSettingsUI();
            updateEditorStatus();
            updateEditorMaterialUI();
            updateEditorToolLabels();
            updateCustomLevelUI();
            renderCustomLevelEditorGrid();
            populateEditorLevelSelect();
        }

        function localizeBilingualHtml(html) {
            if (!html) return '';
            const englishSpanPattern = /<span style="font-size:\s*14px;\s*color:\s*#ccc;">([\s\S]*?)<\/span>/g;
            if (languageMode === 'zh') {
                return html
                    .replace(/<br><span style="font-size:\s*14px;\s*color:\s*#ccc;">[\s\S]*?<\/span><br>/g, '<br>')
                    .replace(/<br><br><span style="font-size:\s*14px;\s*color:\s*#ccc;">[\s\S]*?<\/span>/g, '')
                    .replace(/<span style="font-size:\s*12px;">[\s\S]*?<\/span>/g, '');
            }

            const parts = [];
            let match;
            while ((match = englishSpanPattern.exec(html)) !== null) {
                parts.push(match[1]);
            }
            const continueMatch = html.match(/<div style="([^"]+)">([\s\S]*?)<\/div>/);
            if (parts.length === 0) return html;
            if (continueMatch) {
                parts.push(`<div style="${continueMatch[1]}">${continueMatch[2]}</div>`);
            }
            return parts.join('<br><br>');
        }

        function setupWarmupTargetSettings() {
            if (!warmupTargetMovingInput || !warmupTargetSpeedInput) return;
            warmupTargetMovingInput.checked = warmupTargetSettings.moving;
            warmupTargetSpeedInput.value = String(warmupTargetSettings.speed);
            warmupTargetMovingInput.addEventListener('change', () => {
                warmupTargetSettings.moving = warmupTargetMovingInput.checked;
                localStorage.setItem('warmupTargetMoving', String(warmupTargetSettings.moving));
            });
            warmupTargetSpeedInput.addEventListener('input', () => {
                warmupTargetSettings.speed = Math.max(0.5, Math.min(5, parseFloat(warmupTargetSpeedInput.value) || 1.5));
                localStorage.setItem('warmupTargetSpeed', String(warmupTargetSettings.speed));
                updateWarmupTargetSettingsUI();
            });
            updateWarmupTargetSettingsUI();
        }

        function updateWarmupTargetSettingsUI() {
            if (warmupTargetSpeedValue) {
                warmupTargetSpeedValue.textContent = `${Number(warmupTargetSettings.speed).toFixed(1)}x`;
            }
            if (warmupTargetSettingsPanel) {
                warmupTargetSettingsPanel.style.display = currentStage === 0 && !editorTextureSettings.active ? 'block' : 'none';
            }
        }

        function setupEditorControls() {
            if (!editorPanel || !editorLevelSelect) return;
            preloadEditorTextures();
            populateEditorLevelSelect();

            editorLevelSelect.addEventListener('change', () => {
                editorTextureSettings.selectedStage = parseInt(editorLevelSelect.value, 10) || 0;
                localStorage.setItem('editorSelectedStage', String(editorTextureSettings.selectedStage));
                loadEditorStage(editorTextureSettings.selectedStage);
            });
            if (editorWallModeSelect) {
                editorWallModeSelect.addEventListener('change', () => {
                    setEditorWallMode(editorWallModeSelect.value, true);
                });
            }
            if (editorFloorModeSelect) {
                editorFloorModeSelect.addEventListener('change', () => {
                    setEditorFloorMode(editorFloorModeSelect.value, true);
                });
            }
            if (editorWallInput) {
                editorWallInput.addEventListener('change', () => handleEditorImageUpload(editorWallInput, 'wall'));
            }
            if (editorFloorInput) {
                editorFloorInput.addEventListener('change', () => handleEditorImageUpload(editorFloorInput, 'floor'));
            }
            if (editorWallColorInput) {
                editorWallColorInput.value = editorTextureSettings.wallColor;
                editorWallColorInput.addEventListener('input', () => {
                    setEditorWallMode(WALL_MATERIAL_MODES.COLOR, false);
                    editorTextureSettings.wallColor = editorWallColorInput.value || DEFAULT_WALL_COLOR;
                    localStorage.setItem('editorWallColor', editorTextureSettings.wallColor);
                    updateEditorMaterialUI();
                    loadEditorStage(editorTextureSettings.selectedStage);
                });
            }
            if (editorFloorColorInput) {
                editorFloorColorInput.value = editorTextureSettings.floorColor;
                editorFloorColorInput.addEventListener('input', () => {
                    setEditorFloorMode(FLOOR_MATERIAL_MODES.COLOR, false);
                    editorTextureSettings.floorColor = editorFloorColorInput.value || DEFAULT_FLOOR_COLOR;
                    localStorage.setItem('editorFloorColor', editorTextureSettings.floorColor);
                    updateEditorMaterialUI();
                    loadEditorStage(editorTextureSettings.selectedStage);
                });
            }
            if (editorWallSizeInput) {
                editorWallSizeInput.value = String(editorTextureSettings.wallTextureSize);
                editorWallSizeInput.addEventListener('input', () => {
                    editorTextureSettings.wallTextureSize = parseEditorTextureSize(editorWallSizeInput.value);
                    localStorage.setItem('editorWallTextureSize', String(editorTextureSettings.wallTextureSize));
                    updateEditorTextureRepeat(editorWallTexture, 'wall');
                    updateEditorMaterialUI();
                    loadEditorStage(editorTextureSettings.selectedStage);
                });
            }
            if (editorFloorSizeInput) {
                editorFloorSizeInput.value = String(editorTextureSettings.floorTextureSize);
                editorFloorSizeInput.addEventListener('input', () => {
                    editorTextureSettings.floorTextureSize = parseEditorTextureSize(editorFloorSizeInput.value);
                    localStorage.setItem('editorFloorTextureSize', String(editorTextureSettings.floorTextureSize));
                    updateEditorTextureRepeat(editorFloorTexture, 'floor');
                    updateEditorMaterialUI();
                    loadEditorStage(editorTextureSettings.selectedStage);
                });
            }
            setupCustomLevelEditorControls();
            if (editorApplyButton) {
                editorApplyButton.addEventListener('click', () => loadEditorStage(editorTextureSettings.selectedStage));
            }
            if (editorResetButton) {
                editorResetButton.addEventListener('click', resetEditorTextures);
            }
            if (editorMainMenuButton) {
                editorMainMenuButton.addEventListener('click', () => {
                    editorTextureSettings.active = false;
                    editorPanel.style.display = 'none';
                    if (document.pointerLockElement) document.exitPointerLock();
                    currentStage = -1;
                    stopTimer();
                    modeSelectionScreen.style.display = 'flex';
                    if (playerInfoElement) playerInfoElement.style.display = 'none';
                });
            }
        }

        function normalizeEditorWallMode(mode) {
            return ['palette', 'color', 'image'].includes(mode) ? mode : WALL_MATERIAL_MODES.PALETTE;
        }

        function normalizeEditorFloorMode(mode) {
            return ['color', 'image'].includes(mode) ? mode : FLOOR_MATERIAL_MODES.COLOR;
        }

        function getEditorWallMode() {
            return normalizeEditorWallMode(editorTextureSettings.wallMode);
        }

        function getEditorFloorMode() {
            return normalizeEditorFloorMode(editorTextureSettings.floorMode);
        }

        function clearEditorImage(kind) {
            if (kind === 'wall') {
                editorTextureSettings.wallImage = '';
                editorWallTexture = null;
                localStorage.removeItem('editorWallImage');
                if (editorWallInput) editorWallInput.value = '';
            } else {
                editorTextureSettings.floorImage = '';
                editorFloorTexture = null;
                localStorage.removeItem('editorFloorImage');
                if (editorFloorInput) editorFloorInput.value = '';
            }
        }

        function setEditorWallMode(mode, reload = false) {
            const nextMode = normalizeEditorWallMode(mode);
            editorTextureSettings.wallMode = nextMode;
            localStorage.setItem('editorWallMode', nextMode);
            if (nextMode !== WALL_MATERIAL_MODES.IMAGE) clearEditorImage('wall');
            updateEditorMaterialUI();
            updateEditorStatus();
            if (reload) loadEditorStage(editorTextureSettings.selectedStage);
        }

        function setEditorFloorMode(mode, reload = false) {
            const nextMode = normalizeEditorFloorMode(mode);
            editorTextureSettings.floorMode = nextMode;
            localStorage.setItem('editorFloorMode', nextMode);
            if (nextMode !== FLOOR_MATERIAL_MODES.IMAGE) clearEditorImage('floor');
            updateEditorMaterialUI();
            updateEditorStatus();
            if (reload) loadEditorStage(editorTextureSettings.selectedStage);
        }

        function updateEditorMaterialModeOptions() {
            if (editorWallModeSelect) {
                const wallOptions = [
                    { value: WALL_MATERIAL_MODES.PALETTE, zh: '默认方向配色', en: 'Direction Palette' },
                    { value: WALL_MATERIAL_MODES.COLOR, zh: '单色配色', en: 'Solid Color' },
                    { value: WALL_MATERIAL_MODES.IMAGE, zh: '本地图片', en: 'Local Image' }
                ];
                wallOptions.forEach(optionData => {
                    const option = editorWallModeSelect.querySelector(`option[value="${optionData.value}"]`);
                    if (option) option.textContent = t(optionData.zh, optionData.en);
                });
            }
            if (editorFloorModeSelect) {
                const floorOptions = [
                    { value: FLOOR_MATERIAL_MODES.COLOR, zh: '配色', en: 'Color' },
                    { value: FLOOR_MATERIAL_MODES.IMAGE, zh: '本地图片', en: 'Local Image' }
                ];
                floorOptions.forEach(optionData => {
                    const option = editorFloorModeSelect.querySelector(`option[value="${optionData.value}"]`);
                    if (option) option.textContent = t(optionData.zh, optionData.en);
                });
            }
        }

        function parseEditorTextureSize(value) {
            return Math.max(0.5, Math.min(4, parseFloat(value) || 1));
        }

        function updateEditorMaterialUI() {
            updateEditorMaterialModeOptions();
            const wallMode = getEditorWallMode();
            const floorMode = getEditorFloorMode();
            const wallUsesImage = wallMode === WALL_MATERIAL_MODES.IMAGE;
            const wallUsesColor = wallMode === WALL_MATERIAL_MODES.COLOR;
            const floorUsesImage = floorMode === FLOOR_MATERIAL_MODES.IMAGE;
            const floorUsesColor = floorMode === FLOOR_MATERIAL_MODES.COLOR;
            if (editorWallModeSelect) editorWallModeSelect.value = wallMode;
            if (editorFloorModeSelect) editorFloorModeSelect.value = floorMode;
            if (editorWallColorInput) editorWallColorInput.value = editorTextureSettings.wallColor || DEFAULT_WALL_COLOR;
            if (editorFloorColorInput) editorFloorColorInput.value = editorTextureSettings.floorColor || DEFAULT_FLOOR_COLOR;
            if (editorWallSizeInput) editorWallSizeInput.value = String(editorTextureSettings.wallTextureSize);
            if (editorFloorSizeInput) editorFloorSizeInput.value = String(editorTextureSettings.floorTextureSize);
            if (editorWallSizeValue) editorWallSizeValue.textContent = `${Number(editorTextureSettings.wallTextureSize).toFixed(1)}x`;
            if (editorFloorSizeValue) editorFloorSizeValue.textContent = `${Number(editorTextureSettings.floorTextureSize).toFixed(1)}x`;
            if (editorWallInput) editorWallInput.disabled = !wallUsesImage;
            if (editorWallColorInput) editorWallColorInput.disabled = !wallUsesColor;
            if (editorWallSizeInput) editorWallSizeInput.disabled = !wallUsesImage;
            if (editorFloorInput) editorFloorInput.disabled = !floorUsesImage;
            if (editorFloorColorInput) editorFloorColorInput.disabled = !floorUsesColor;
            if (editorFloorSizeInput) editorFloorSizeInput.disabled = !floorUsesImage;
        }

        function preloadEditorTextures() {
            if (getEditorWallMode() === WALL_MATERIAL_MODES.IMAGE && editorTextureSettings.wallImage) {
                editorWallTexture = createEditorTexture(editorTextureSettings.wallImage, 'wall');
            }
            if (getEditorFloorMode() === FLOOR_MATERIAL_MODES.IMAGE && editorTextureSettings.floorImage) {
                editorFloorTexture = createEditorTexture(editorTextureSettings.floorImage, 'floor');
            }
        }

        function populateEditorLevelSelect() {
            if (!editorLevelSelect) return;
            const previousValue = editorLevelSelect.value;
            if (editorLevelSelect.options.length === 0) {
                const stages = [0];
                for (let i = 1; i <= 32; i++) stages.push(i);
                stages.forEach(stageId => {
                    const option = document.createElement('option');
                    option.value = String(stageId);
                    option.textContent = stageId === 0
                        ? t('热身', 'Warm-up')
                        : `${t('关卡', 'Level')} ${stageId}`;
                    editorLevelSelect.appendChild(option);
                });
            } else {
                Array.from(editorLevelSelect.options).forEach(option => {
                    const stageId = parseInt(option.value, 10);
                    option.textContent = stageId === 0
                        ? t('热身', 'Warm-up')
                        : `${t('关卡', 'Level')} ${stageId}`;
                });
            }
            const selected = previousValue || String(editorTextureSettings.selectedStage || 0);
            editorLevelSelect.value = selected;
        }

        function startEditorMode() {
            editorTextureSettings.active = true;
            modeSelectionScreen.style.display = 'none';
            if (playerInfoElement) playerInfoElement.style.display = 'none';
            if (editorPanel) editorPanel.style.display = 'block';
            populateEditorLevelSelect();
            loadEditorStage(editorTextureSettings.selectedStage || 0);
        }

        function loadEditorStage(stageId) {
            editorTextureSettings.active = true;
            editorTextureSettings.selectedStage = Math.max(0, Math.min(32, parseInt(stageId, 10) || 0));
            localStorage.setItem('editorSelectedStage', String(editorTextureSettings.selectedStage));
            if (editorLevelSelect) editorLevelSelect.value = String(editorTextureSettings.selectedStage);
            loadStage(editorTextureSettings.selectedStage);
            showEditorAfterStageLoad();
        }

        function showEditorAfterStageLoad() {
            if (!editorTextureSettings.active) return;
            if (editorPanel) editorPanel.style.display = 'block';
            if (blockerElement) blockerElement.style.display = 'none';
            if (instructionElement) instructionElement.style.display = 'none';
            if (menuOverlay) menuOverlay.style.display = 'none';
            if (warmupTargetSettingsPanel) warmupTargetSettingsPanel.style.display = 'none';
            if (timerElement) timerElement.style.display = 'none';
            if (npcCounterElement) npcCounterElement.style.display = 'none';
            if (landmarkCounterElement) landmarkCounterElement.style.display = 'none';
            if (genericCounterElement) genericCounterElement.style.display = 'none';
            if (mapUsesCounterElement) mapUsesCounterElement.style.display = 'none';
            canPlayerMove = false;
            stopTimer();
            updateEditorStatus();
        }

        function handleEditorImageUpload(input, kind) {
            const file = input && input.files ? input.files[0] : null;
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result || '');
                let storageWarning = false;
                if (kind === 'wall') {
                    editorTextureSettings.wallMode = WALL_MATERIAL_MODES.IMAGE;
                    editorTextureSettings.wallImage = dataUrl;
                    localStorage.setItem('editorWallMode', WALL_MATERIAL_MODES.IMAGE);
                    try {
                        localStorage.setItem('editorWallImage', dataUrl);
                    } catch (error) {
                        storageWarning = true;
                        if (editorStatusElement) editorStatusElement.textContent = t('图片过大，仅应用到当前预览', 'Image too large; applied to current preview only');
                    }
                    editorWallTexture = createEditorTexture(dataUrl, 'wall', () => loadEditorStage(editorTextureSettings.selectedStage));
                } else {
                    editorTextureSettings.floorMode = FLOOR_MATERIAL_MODES.IMAGE;
                    editorTextureSettings.floorImage = dataUrl;
                    localStorage.setItem('editorFloorMode', FLOOR_MATERIAL_MODES.IMAGE);
                    try {
                        localStorage.setItem('editorFloorImage', dataUrl);
                    } catch (error) {
                        storageWarning = true;
                        if (editorStatusElement) editorStatusElement.textContent = t('图片过大，仅应用到当前预览', 'Image too large; applied to current preview only');
                    }
                    editorFloorTexture = createEditorTexture(dataUrl, 'floor', () => loadEditorStage(editorTextureSettings.selectedStage));
                }
                updateEditorMaterialUI();
                if (!storageWarning) updateEditorStatus();
            };
            reader.readAsDataURL(file);
        }

        function createEditorTexture(dataUrl, kind, onReady) {
            const texture = new THREE.TextureLoader().load(dataUrl, () => {
                texture.needsUpdate = true;
                if (typeof onReady === 'function') onReady();
            });
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            updateEditorTextureRepeat(texture, kind);
            if (renderer && renderer.capabilities) {
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            }
            if (THREE.sRGBEncoding) {
                texture.encoding = THREE.sRGBEncoding;
            }
            return texture;
        }

        function updateEditorTextureRepeat(texture, kind) {
            if (!texture) return;
            const size = kind === 'floor'
                ? parseEditorTextureSize(editorTextureSettings.floorTextureSize)
                : parseEditorTextureSize(editorTextureSettings.wallTextureSize);
            const baseRepeat = kind === 'floor' ? 6 : 2;
            const repeat = Math.max(0.25, baseRepeat / size);
            texture.repeat.set(repeat, repeat);
            texture.needsUpdate = true;
        }

        function resetEditorTextures() {
            editorTextureSettings.wallMode = WALL_MATERIAL_MODES.PALETTE;
            editorTextureSettings.floorMode = FLOOR_MATERIAL_MODES.COLOR;
            localStorage.setItem('editorWallMode', WALL_MATERIAL_MODES.PALETTE);
            localStorage.setItem('editorFloorMode', FLOOR_MATERIAL_MODES.COLOR);
            clearEditorImage('wall');
            clearEditorImage('floor');
            localStorage.setItem('editorWallColor', editorTextureSettings.wallColor || DEFAULT_WALL_COLOR);
            localStorage.setItem('editorFloorColor', editorTextureSettings.floorColor || DEFAULT_FLOOR_COLOR);
            updateEditorMaterialUI();
            loadEditorStage(editorTextureSettings.selectedStage);
            updateEditorStatus();
        }

        function updateEditorStatus() {
            if (!editorStatusElement) return;
            const wallMode = getEditorWallMode();
            const floorMode = getEditorFloorMode();
            const wallReady = wallMode === WALL_MATERIAL_MODES.IMAGE && !!editorTextureSettings.wallImage;
            const floorReady = floorMode === FLOOR_MATERIAL_MODES.IMAGE && !!editorTextureSettings.floorImage;
            const customReady = !!localStorage.getItem('customLevelData');
            const wallStatus = wallMode === WALL_MATERIAL_MODES.IMAGE
                ? (wallReady ? t('墙体：本地图片', 'Wall: local image') : t('墙体：等待上传图片', 'Wall: waiting for image'))
                : (wallMode === WALL_MATERIAL_MODES.COLOR ? t('墙体：单色配色', 'Wall: solid color') : t('墙体：默认方向配色', 'Wall: direction palette'));
            const floorStatus = floorMode === FLOOR_MATERIAL_MODES.IMAGE
                ? (floorReady ? t('地面：本地图片', 'Floor: local image') : t('地面：等待上传图片', 'Floor: waiting for image'))
                : t('地面：配色', 'Floor: color');
            editorStatusElement.textContent = customReady
                ? `${wallStatus} · ${floorStatus} · ${t('自定义关卡已保存', 'Custom level saved')}`
                : `${wallStatus} · ${floorStatus}`;
        }

        function getDefaultCustomLevel() {
            const rows = 12;
            const cols = 12;
            const grid = Array.from({ length: rows }, (_, r) =>
                Array.from({ length: cols }, (_, c) => (r === 0 || c === 0 || r === rows - 1 || c === cols - 1 ? 1 : 0))
            );
            for (let c = 3; c < 9; c++) grid[5][c] = 1;
            grid[5][6] = 0;
            return {
                name: '自定义关卡',
                rows,
                cols,
                grid,
                start: { r: 1, c: 1 },
                finish: { r: 10, c: 10 },
                landmarks: [{ r: 2, c: 8 }, { r: 8, c: 3 }],
                npcs: [{ r: 9, c: 2 }],
                turrets: [{ r: 2, c: 10 }],
                goals: { reach: true, landmarks: false, npc: false, annihilation: false },
                minimap: {
                    enabled: true,
                    playerCentered: false,
                    rotateWithPlayer: false,
                    hideOnClick: false,
                    staticEOnly: false,
                    size: 200
                }
            };
        }

        function sanitizeCustomLevel(level) {
            const fallback = getDefaultCustomLevel();
            const safe = level && typeof level === 'object' ? level : fallback;
            const rows = Math.max(6, Math.min(20, parseInt(safe.rows, 10) || fallback.rows));
            const cols = Math.max(6, Math.min(20, parseInt(safe.cols, 10) || fallback.cols));
            const grid = Array.from({ length: rows }, (_, r) =>
                Array.from({ length: cols }, (_, c) => {
                    const row = Array.isArray(safe.grid && safe.grid[r]) ? safe.grid[r] : [];
                    return row[c] === 1 ? 1 : 0;
                })
            );
            const clampCell = (cell, backup) => ({
                r: Math.max(0, Math.min(rows - 1, parseInt(cell && cell.r, 10) || backup.r)),
                c: Math.max(0, Math.min(cols - 1, parseInt(cell && cell.c, 10) || backup.c))
            });
            const listCells = (items) => Array.isArray(items)
                ? items.map(item => clampCell(item, { r: 1, c: 1 }))
                    .filter((cell, index, arr) => arr.findIndex(other => other.r === cell.r && other.c === cell.c) === index)
                    .slice(0, 12)
                : [];
            const start = clampCell(safe.start, fallback.start);
            const finish = clampCell(safe.finish, fallback.finish);
            const landmarks = listCells(safe.landmarks);
            const npcsList = listCells(safe.npcs);
            const turretsList = listCells(safe.turrets);
            [start, finish, ...landmarks, ...npcsList, ...turretsList].forEach(cell => {
                if (grid[cell.r] && typeof grid[cell.r][cell.c] !== 'undefined') grid[cell.r][cell.c] = 0;
            });
            return {
                name: String(safe.name || fallback.name).slice(0, 28),
                rows,
                cols,
                grid,
                start,
                finish,
                landmarks,
                npcs: npcsList,
                turrets: turretsList,
                goals: {
                    reach: !!(safe.goals ? safe.goals.reach : fallback.goals.reach),
                    landmarks: !!(safe.goals ? safe.goals.landmarks : fallback.goals.landmarks),
                    npc: !!(safe.goals ? safe.goals.npc : fallback.goals.npc),
                    annihilation: !!(safe.goals ? safe.goals.annihilation : fallback.goals.annihilation)
                },
                minimap: {
                    enabled: safe.minimap ? safe.minimap.enabled !== false : fallback.minimap.enabled,
                    playerCentered: !!(safe.minimap && safe.minimap.playerCentered),
                    rotateWithPlayer: !!(safe.minimap && safe.minimap.rotateWithPlayer),
                    hideOnClick: !!(safe.minimap && safe.minimap.hideOnClick),
                    staticEOnly: !!(safe.minimap && safe.minimap.staticEOnly),
                    size: Math.max(120, Math.min(320, parseInt(safe.minimap && safe.minimap.size, 10) || fallback.minimap.size))
                }
            };
        }

        function getStoredCustomLevel() {
            try {
                const stored = localStorage.getItem('customLevelData');
                if (stored) return sanitizeCustomLevel(JSON.parse(stored));
            } catch (error) {
                localStorage.removeItem('customLevelData');
            }
            return sanitizeCustomLevel(customLevelData || getDefaultCustomLevel());
        }

        function saveCustomLevelData() {
            syncCustomLevelFromInputs();
            customLevelData = sanitizeCustomLevel(customLevelData);
            localStorage.setItem('customLevelData', JSON.stringify(customLevelData));
            updateEditorStatus();
            updateLevelSelectMenu();
            renderCustomLevelEditorGrid();
        }

        function setupCustomLevelEditorControls() {
            customLevelData = getStoredCustomLevel();
            updateCustomLevelUI();
            updateEditorToolLabels();
            renderCustomLevelEditorGrid();

            document.querySelectorAll('.editor-tool').forEach(button => {
                button.addEventListener('click', () => {
                    editorTool = button.dataset.tool || 'wall';
                    updateEditorToolLabels();
                });
            });
            if (editorGridCanvas) {
                editorGridCanvas.addEventListener('click', handleEditorGridClick);
            }
            [
                'editor-goal-reach', 'editor-goal-landmarks', 'editor-goal-npc', 'editor-goal-annihilation',
                'editor-minimap-enabled', 'editor-minimap-centered', 'editor-minimap-rotate',
                'editor-minimap-click-hide', 'editor-minimap-static-e'
            ].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.addEventListener('change', () => {
                    syncCustomLevelFromInputs();
                    renderCustomLevelEditorGrid();
                });
            });
            if (editorCustomNameInput) {
                editorCustomNameInput.addEventListener('input', () => syncCustomLevelFromInputs());
            }
            if (editorMinimapSizeInput) {
                editorMinimapSizeInput.addEventListener('input', () => {
                    syncCustomLevelFromInputs();
                    updateCustomLevelUI();
                });
            }
            if (editorSaveCustomButton) {
                editorSaveCustomButton.addEventListener('click', saveCustomLevelData);
            }
            if (editorPlayCustomButton) {
                editorPlayCustomButton.addEventListener('click', () => {
                    saveCustomLevelData();
                    editorTextureSettings.active = false;
                    if (editorPanel) editorPanel.style.display = 'none';
                    gameMode = 'free';
                    loadStage(CUSTOM_STAGE_ID);
                });
            }
            if (minimapContainer) {
                minimapContainer.addEventListener('click', () => {
                    const custom = scene && scene.userData ? scene.userData.customLevel : null;
                    if (custom && custom.minimap && custom.minimap.hideOnClick) {
                        minimapContainer.style.display = 'none';
                    }
                });
            }
        }

        function syncCustomLevelFromInputs() {
            if (!customLevelData) customLevelData = getDefaultCustomLevel();
            customLevelData.name = (editorCustomNameInput && editorCustomNameInput.value.trim()) || t('自定义关卡', 'Custom Level');
            customLevelData.goals = {
                reach: !!document.getElementById('editor-goal-reach')?.checked,
                landmarks: !!document.getElementById('editor-goal-landmarks')?.checked,
                npc: !!document.getElementById('editor-goal-npc')?.checked,
                annihilation: !!document.getElementById('editor-goal-annihilation')?.checked
            };
            if (!customLevelData.goals.reach && !customLevelData.goals.landmarks && !customLevelData.goals.npc && !customLevelData.goals.annihilation) {
                customLevelData.goals.reach = true;
                const reachInput = document.getElementById('editor-goal-reach');
                if (reachInput) reachInput.checked = true;
            }
            customLevelData.minimap = {
                enabled: !!document.getElementById('editor-minimap-enabled')?.checked,
                playerCentered: !!document.getElementById('editor-minimap-centered')?.checked,
                rotateWithPlayer: !!document.getElementById('editor-minimap-rotate')?.checked,
                hideOnClick: !!document.getElementById('editor-minimap-click-hide')?.checked,
                staticEOnly: !!document.getElementById('editor-minimap-static-e')?.checked,
                size: Math.max(120, Math.min(320, parseInt(editorMinimapSizeInput && editorMinimapSizeInput.value, 10) || 200))
            };
        }

        function updateCustomLevelUI() {
            if (!customLevelData) customLevelData = getStoredCustomLevel();
            if (editorCustomNameInput) editorCustomNameInput.value = customLevelData.name || t('自定义关卡', 'Custom Level');
            const setChecked = (id, value) => {
                const input = document.getElementById(id);
                if (input) input.checked = !!value;
            };
            setChecked('editor-goal-reach', customLevelData.goals.reach);
            setChecked('editor-goal-landmarks', customLevelData.goals.landmarks);
            setChecked('editor-goal-npc', customLevelData.goals.npc);
            setChecked('editor-goal-annihilation', customLevelData.goals.annihilation);
            setChecked('editor-minimap-enabled', customLevelData.minimap.enabled);
            setChecked('editor-minimap-centered', customLevelData.minimap.playerCentered);
            setChecked('editor-minimap-rotate', customLevelData.minimap.rotateWithPlayer);
            setChecked('editor-minimap-click-hide', customLevelData.minimap.hideOnClick);
            setChecked('editor-minimap-static-e', customLevelData.minimap.staticEOnly);
            if (editorMinimapSizeInput) editorMinimapSizeInput.value = String(customLevelData.minimap.size);
            if (editorMinimapSizeValue) editorMinimapSizeValue.textContent = `${customLevelData.minimap.size}px`;
        }

        function updateEditorToolLabels() {
            const labels = {
                wall: t('墙', 'Wall'),
                floor: t('地', 'Floor'),
                start: t('起点', 'Start'),
                finish: t('终点', 'Goal'),
                landmark: t('路标', 'Landmark'),
                npc: 'NPC',
                turret: t('歼灭', 'Turret')
            };
            document.querySelectorAll('.editor-tool').forEach(button => {
                const tool = button.dataset.tool;
                button.textContent = labels[tool] || tool;
                button.classList.toggle('active', tool === editorTool);
            });
        }

        function handleEditorGridClick(event) {
            if (!editorGridCanvas) return;
            if (!customLevelData) customLevelData = getStoredCustomLevel();
            const rect = editorGridCanvas.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            const c = Math.max(0, Math.min(customLevelData.cols - 1, Math.floor(x * customLevelData.cols)));
            const r = Math.max(0, Math.min(customLevelData.rows - 1, Math.floor(y * customLevelData.rows)));
            applyEditorToolToCell(r, c);
            renderCustomLevelEditorGrid();
        }

        function removeCustomMarkersAt(r, c) {
            if (!customLevelData) return;
            ['landmarks', 'npcs', 'turrets'].forEach(key => {
                customLevelData[key] = customLevelData[key].filter(item => !(item.r === r && item.c === c));
            });
        }

        function toggleCustomMarker(listName, r, c) {
            const list = customLevelData[listName] || [];
            const existing = list.findIndex(item => item.r === r && item.c === c);
            if (existing >= 0) {
                list.splice(existing, 1);
            } else {
                removeCustomMarkersAt(r, c);
                list.push({ r, c });
            }
            customLevelData[listName] = list.slice(0, 12);
            customLevelData.grid[r][c] = 0;
        }

        function applyEditorToolToCell(r, c) {
            if (!customLevelData) return;
            if (editorTool === 'wall') {
                customLevelData.grid[r][c] = 1;
                if (customLevelData.start.r === r && customLevelData.start.c === c) customLevelData.start = { r: 1, c: 1 };
                if (customLevelData.finish.r === r && customLevelData.finish.c === c) customLevelData.finish = { r: customLevelData.rows - 2, c: customLevelData.cols - 2 };
                removeCustomMarkersAt(r, c);
            } else if (editorTool === 'floor') {
                customLevelData.grid[r][c] = 0;
                removeCustomMarkersAt(r, c);
            } else if (editorTool === 'start') {
                customLevelData.grid[r][c] = 0;
                removeCustomMarkersAt(r, c);
                customLevelData.start = { r, c };
            } else if (editorTool === 'finish') {
                customLevelData.grid[r][c] = 0;
                removeCustomMarkersAt(r, c);
                customLevelData.finish = { r, c };
            } else if (editorTool === 'landmark') {
                toggleCustomMarker('landmarks', r, c);
            } else if (editorTool === 'npc') {
                toggleCustomMarker('npcs', r, c);
            } else if (editorTool === 'turret') {
                toggleCustomMarker('turrets', r, c);
            }
            syncCustomLevelFromInputs();
        }

        function renderCustomLevelEditorGrid() {
            if (!editorGridCanvas) return;
            if (!customLevelData) customLevelData = getStoredCustomLevel();
            const ctx = editorGridCanvas.getContext('2d');
            const width = editorGridCanvas.width;
            const height = editorGridCanvas.height;
            const cellW = width / customLevelData.cols;
            const cellH = height / customLevelData.rows;
            ctx.clearRect(0, 0, width, height);
            for (let r = 0; r < customLevelData.rows; r++) {
                for (let c = 0; c < customLevelData.cols; c++) {
                    ctx.fillStyle = customLevelData.grid[r][c] === 1 ? '#ff00f5' : '#123cff';
                    ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
                    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
                    ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
                }
            }
            const drawMarker = (cell, label, color) => {
                if (!cell) return;
                const x = cell.c * cellW + cellW / 2;
                const y = cell.r * cellH + cellH / 2;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, Math.min(cellW, cellH) * 0.32, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = `bold ${Math.max(10, Math.floor(cellH * 0.36))}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, x, y);
            };
            drawMarker(customLevelData.start, 'S', '#76ff03');
            drawMarker(customLevelData.finish, 'F', '#ffea00');
            customLevelData.landmarks.forEach((cell, index) => drawMarker(cell, String(index + 1), '#ffffff'));
            customLevelData.npcs.forEach(cell => drawMarker(cell, 'N', '#00e5ff'));
            customLevelData.turrets.forEach(cell => drawMarker(cell, 'T', '#ff4f9f'));
        }

        function updateCurrentCounters() {
            if (isCustomStage(currentStage)) updateCustomGoalCounter();
            if (currentStage >= 13 && currentStage <= 15) updateNpcCounter();
            if (currentStage >= 16 && currentStage <= 26) {
                updateLandmarkCounter();
                updateMapUsesCounter();
            }
            if (currentStage >= 2 && currentStage <= 4 && shuttleRunState.targets) {
                updateGenericCounter(t(`已完成: ${shuttleRunState.completedCount || 0} / 10`, `Completed: ${shuttleRunState.completedCount || 0} / 10`));
            }
            if (currentStage === 5 && corridorState.allTargets) {
                updateGenericCounter(t(`已激活: ${activatedCorridorTargets.size} / ${corridorState.allTargets.length}`, `Activated: ${activatedCorridorTargets.size} / ${corridorState.allTargets.length}`));
            }
        }

        function loadProgress() {
            if (gameMode === 'campaign') {
                const savedUnlockedLevel = localStorage.getItem('unlockedLevel');
                unlockedLevel = savedUnlockedLevel ? parseInt(savedUnlockedLevel, 10) : 1;
                const savedLevelTimes = localStorage.getItem('levelTimes_campaign');
                levelTimes = savedLevelTimes ? JSON.parse(savedLevelTimes) : {};
                const savedStars = localStorage.getItem('levelStars');
                levelStars = savedStars ? JSON.parse(savedStars) : {};
            } else {
                const savedLevelTimes = localStorage.getItem('levelTimes_free');
                levelTimes = savedLevelTimes ? JSON.parse(savedLevelTimes) : {};
            }
        }

        function saveProgress() {
            if (gameMode === 'campaign') {
                localStorage.setItem('unlockedLevel', unlockedLevel);
                localStorage.setItem('levelTimes_campaign', JSON.stringify(levelTimes));
                localStorage.setItem('levelStars', JSON.stringify(levelStars));
            } else {
                localStorage.setItem('levelTimes_free', JSON.stringify(levelTimes));
            }
        }
        
        function recordTime(stage, time) {
            const stageId = stage;
            if (!levelTimes[stageId] || time < levelTimes[stageId]) {
                levelTimes[stageId] = time;
            }
        }

        function setupModeSelection() {
            document.getElementById('campaign-mode-button').addEventListener('click', () => {
                gameMode = 'campaign';
                const savedProfile = localStorage.getItem('playerProfile');
                if (savedProfile) {
                    playerProfile = JSON.parse(savedProfile);
                    startGame();
                } else {
                    modeSelectionScreen.style.display = 'none';
                    document.getElementById('profile-creation-overlay').style.display = 'flex';
                }
            });
            document.getElementById('free-mode-button').addEventListener('click', () => { 
                gameMode = 'free'; 
                startGame(); 
            });
            document.getElementById('editor-mode-button').addEventListener('click', () => {
                gameMode = 'editor';
                startEditorMode();
            });
            setupProfileCreation();
        }

        function setupProfileCreation() {
            const nicknameInput = document.getElementById('nickname-input');
            const maleButton = document.getElementById('male-button');
            const femaleButton = document.getElementById('female-button');
            const startButton = document.getElementById('start-campaign-button');
            let selectedGender = '';

            maleButton.addEventListener('click', () => {
                selectedGender = 'male';
                maleButton.classList.add('selected');
                femaleButton.classList.remove('selected');
            });

            femaleButton.addEventListener('click', () => {
                selectedGender = 'female';
                femaleButton.classList.add('selected');
                maleButton.classList.remove('selected');
            });

            startButton.addEventListener('click', () => {
                const nickname = nicknameInput.value.trim();
                if (!nickname) {
                    nicknameInput.style.border = '2px solid red';
                    return;
                }
                 nicknameInput.style.border = '2px solid #555';
                if (!selectedGender) {
                    maleButton.style.border = '2px solid red';
                    femaleButton.style.border = '2px solid red';
                    return;
                }
                playerProfile.nickname = nickname;
                playerProfile.title = selectedGender === 'male' ? `${nickname} 叔叔` : `${nickname} 阿姨`;
                playerProfile.en_title = selectedGender === 'male' ? `Uncle ${nickname}` : `Auntie ${nickname}`;
                localStorage.setItem('playerProfile', JSON.stringify(playerProfile));
                document.getElementById('profile-creation-overlay').style.display = 'none';
                startGame();
            });
        }
        
        function startGame() {
            editorTextureSettings.active = false;
            if (editorPanel) editorPanel.style.display = 'none';
            loadProgress();
            modeSelectionScreen.style.display = 'none';
            loadStage(0);
        }

        function setupMenu() {
            blockerElement.addEventListener('click', () => {
                if (isPlayerDead) return;
                if (stageCompletionFlag) {
                    if (gameMode === 'campaign' && currentStage < TOTAL_LEVELS) {
                         const _next = (currentStage + 1 === 6 ? 7 : currentStage + 1); hideMenuAndLoad(_next);
                    } else {
                        stageCompletionFlag = false;
                        blockerElement.style.display = 'none';
                        menuOverlay.style.display = 'flex';
                        updateLevelSelectMenu();
                    }
                    return;
                }
                document.body.requestPointerLock();
            });
            document.getElementById('resume-button').addEventListener('click', () => { document.body.requestPointerLock(); });
            document.getElementById('restart-button').addEventListener('click', () => { hideMenuAndLoad(currentStage); });
            document.getElementById('warmup-button').addEventListener('click', () => { hideMenuAndLoad(0); });
            document.getElementById('main-menu-button').addEventListener('click', () => {
                if (document.pointerLockElement) document.exitPointerLock();
                editorTextureSettings.active = false;
                currentStage = -1;
                stopTimer();
                menuOverlay.style.display = 'none';
                if (editorPanel) editorPanel.style.display = 'none';
                modeSelectionScreen.style.display = 'flex';
                if (playerInfoElement) playerInfoElement.style.display = 'none';
            });
            document.getElementById('select-level-button').addEventListener('click', (event) => {
                event.stopPropagation();
                levelSelectMenu.style.display = levelSelectMenu.style.display === 'flex' ? 'none' : 'flex';
            });
            document.getElementById('reset-game-button').addEventListener('click', () => {
                resetConfirmOverlay.style.display = 'flex';
            });
        }
        
        function setupResultsScreen() {
            document.getElementById('close-results-button').addEventListener('click', () => {
                resultsOverlay.style.display = 'none';
                const mainMenuButton = document.getElementById('main-menu-button');
                if (mainMenuButton) mainMenuButton.click();
            });
        }
        
        function setupTrainingChoice() {
            document.getElementById('training-yes').addEventListener('click', () => {
                wasdTrainingMode = 'special';
                trainingChoiceOverlay.style.display = 'none';
                document.body.requestPointerLock();
                startNextTrainingCommand();
            });
            document.getElementById('training-no').addEventListener('click', () => {
                wasdTrainingMode = 'free';
                trainingChoiceOverlay.style.display = 'none';
                document.body.requestPointerLock();
            });
        }

        function setupResetConfirmation() {
            document.getElementById('reset-confirm-no').addEventListener('click', () => {
                resetConfirmOverlay.style.display = 'none';
            });
            document.getElementById('reset-confirm-yes').addEventListener('click', () => {
                localStorage.removeItem('playerProfile');
                localStorage.removeItem('unlockedLevel');
                localStorage.removeItem('levelTimes_campaign');
                localStorage.removeItem('levelStars');
                
                playerProfile = { nickname: '', title: '', en_title: '' };
                unlockedLevel = 1;
                levelTimes = {};
                levelStars = {};

                resetConfirmOverlay.style.display = 'none';
                document.getElementById('main-menu-button').click();
            });
        }

        function setupWarmupConfirmation() {
            document.getElementById('warmup-confirm-yes').addEventListener('click', () => {
                warmupConfirmOverlay.style.display = 'none';
                hideMenuAndLoad(1);
            });
            document.getElementById('warmup-confirm-no').addEventListener('click', () => {
                warmupConfirmOverlay.style.display = 'none';
                document.body.requestPointerLock();
            });
        }

        
function updateLevelSelectMenu() {
    const baseNames = [
        { zh: "注意力：定点聚焦", en: "Attention: Point Focus" },
        { zh: "反应速度：瞬时响应", en: "Reaction: Quick Response" },
        { zh: "处理速度：动态追踪", en: "Processing: Dynamic Tracking" },
        { zh: "预判能力：轨迹预测", en: "Prediction: Trajectory Forecast" },
        { zh: "手眼协调：同步处理", en: "Coordination: Synchronized Tasks" },
        { zh: "动作规划：节奏跨越", en: "Motor Skills: Rhythmic Leap" },
        { zh: "认知灵活性：任务切换", en: "Cognitive Flexibility: Task Switching" },
        { zh: "工作记忆：迷宫速通 I", en: "Working Memory: Maze Sprint I" },
        { zh: "工作记忆：迷宫速通 II", en: "Working Memory: Maze Sprint II" },
        { zh: "工作记忆：迷宫速通 III", en: "Working Memory: Maze Sprint III" },
        { zh: "工作记忆：迷宫速通 IV", en: "Working Memory: Maze Sprint IV" },
        { zh: "策略思维：动态博弈 I", en: "Strategic Thinking: Dynamic Chase I" },
        { zh: "策略思维：动态博弈 II", en: "Strategic Thinking: Dynamic Chase II" },
        { zh: "策略思维：动态博弈 III", en: "Strategic Thinking: Dynamic Chase III" },
        { zh: "顺序记忆：地标寻踪 I", en: "Sequential Memory: Landmark Trace I" },
        { zh: "顺序记忆：地标寻踪 II", en: "Sequential Memory: Landmark Trace II" },
        { zh: "顺序记忆：地标寻踪 III", en: "Sequential Memory: Landmark Trace III" },
        { zh: "顺序记忆：地标寻踪 IV", en: "Sequential Memory: Landmark Trace IV" },
        { zh: "顺序记忆：地标寻踪 V", en: "Sequential Memory: Landmark Trace V" },
        { zh: "顺序记忆：地标寻踪 VI", en: "Sequential Memory: Landmark Trace VI" },
        { zh: "风险决策：火线突围 I", en: "Risk & Decision: Hazard Breakout I" },
        { zh: "风险决策：火线突围 II", en: "Risk & Decision: Hazard Breakout II" },
        { zh: "风险决策：火线突围 III", en: "Risk & Decision: Hazard Breakout III" },
        { zh: "风险决策：火线突围 IV", en: "Risk & Decision: Hazard Breakout IV" },
        { zh: "风险决策：火线突围 V", en: "Risk & Decision: Hazard Breakout V" },
        { zh: "综合能力认证", en: "Cognitive Mastery" }
    ];
    const mapping = [];
    for (let i = 0; i < baseNames.length; i++) {
        const name = baseNames[i];
        const stageIndex = i + 1;
        const stageId = (stageIndex >= 6 ? stageIndex + 1 : stageIndex);
        mapping.push({ stageId, zh: name.zh, en: name.en });
    }
    const insertAt = 4;
    const survival = [
        { stageId: 28, zh: "生存试炼：炮塔竞技 I", en: "Survival: Turret Arena I" },
        { stageId: 29, zh: "生存试炼：炮塔竞技 II", en: "Survival: Turret Arena II" },
        { stageId: 30, zh: "生存试炼：炮塔竞技 III", en: "Survival: Turret Arena III" },
        { stageId: 31, zh: "生存试炼：炮塔竞技 IV", en: "Survival: Turret Arena IV" },
        { stageId: 32, zh: "生存试炼：炮塔竞技 V", en: "Survival: Turret Arena V" }
    ];
    const ordered = mapping.slice(0, insertAt).concat(survival, mapping.slice(insertAt));

    levelSelectMenu.innerHTML = '';
    if (gameMode === 'free' && localStorage.getItem('customLevelData')) {
        const customLevel = getStoredCustomLevel();
        const button = document.createElement('button');
        button.className = 'menu-button';
        button.innerHTML = `${t('自定义关卡', 'Custom Level')}<br><span style="font-size:12px;">${customLevel.name || t('本地关卡', 'Local Level')}</span>`;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            hideMenuAndLoad(CUSTOM_STAGE_ID);
        });
        levelSelectMenu.appendChild(button);
    }
    ordered.forEach(({stageId, zh, en}) => {
        const button = document.createElement('button');
        button.className = 'menu-button';
        const isLocked = (gameMode === 'campaign' && stageId > unlockedLevel);
        let buttonHTML = t(zh, en);
        if (isLocked) {
            buttonHTML += ` <br><span style="font-size:12px; color: #888;">${t('(锁定)', '(Locked)')}</span>`;
            button.classList.add('disabled');
        } else {
            const bestTime = levelTimes[stageId];
            if (bestTime) { buttonHTML += `<div class="level-time">${t('最快', 'Best')}: ${bestTime.toFixed(2)}s</div>`; }
            if (gameMode === 'campaign' && levelStars[stageId]) {
                buttonHTML += `<div class="level-stars">${displayStars(levelStars[stageId])}</div>`;
            }
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                hideMenuAndLoad(stageId);
            });
        }
        button.innerHTML = buttonHTML;
        levelSelectMenu.appendChild(button);
    });
}

        function hideMenuAndLoad(stage) {
            menuOverlay.style.display = 'none';
            levelSelectMenu.style.display = 'none';
            isTransitioning = true;
            if (document.pointerLockElement) { document.exitPointerLock(); }
            setTimeout(() => { loadStage(stage); }, 100);
        }

        function onPointerlockChange() {
			// Guard against menu flash when resuming via ESC (with grace window)
			try {
			  const el = document.body;
			  const locked = (document.pointerLockElement === el);
			  if (!locked && typeof resumeRequested !== 'undefined' && resumeRequested) {
				// Still waiting for lock; don't reopen the menu
				return;
			  }
			  if (locked && typeof resumeRequested !== 'undefined' && resumeRequested) {
				// Lock acquired for resume; keep resumeRequested true briefly to ignore any immediate unlock
				setTimeout(function(){
				  resumeRequested = false;
				  isTransitioning = false;
				}, 120); // grace window
			  }
			} catch (_e) { /* ignore */ }
            if (document.pointerLockElement === document.body) {
                isTransitioning = false; 
                menuOverlay.style.display = 'none';
                blockerElement.style.display = 'none';
                crosshairElement.style.display = 'block';
                keyDisplay.style.opacity = '1';
                document.addEventListener('mousemove', onMouseMove, false);
                resumeTimer();
            } else {
                crosshairElement.style.display = 'none';
                keyDisplay.style.opacity = '0';
                document.removeEventListener('mousemove', onMouseMove, false);
                pauseTimer();
                if (!isTransitioning && !stageCompletionFlag && !isPlayerDead && resultsOverlay.style.display !== 'flex' && trainingChoiceOverlay.style.display !== 'flex' && resetConfirmOverlay.style.display !== 'flex' && warmupConfirmOverlay.style.display !== 'flex') {
                    menuOverlay.style.display = 'flex';
                    document.getElementById('reset-game-button').style.display = (gameMode === 'campaign') ? 'inline-block' : 'none';
                    updateLevelSelectMenu();
                }
            }
        }

        function onPointerlockError() { console.error('Pointer Lock Error.'); }
        
        function onMouseMove(event) {
            if (document.pointerLockElement !== document.body) return;
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            if (Math.abs(movementX) > 500 || Math.abs(movementY) > 500) { return; }
            euler.setFromQuaternion(camera.quaternion);
            euler.y -= movementX * 0.002;
            euler.x -= movementY * 0.002;
            euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
            camera.quaternion.setFromEuler(euler);
        }

        function onMouseDown(event) {
            if (narrationBox.style.display === 'block') {
                narrationBox.style.display = 'none';
                return;
            }
            if (isPlayerDead) return;

            if (currentStage === 0 && wasdTrainingMode === 'special') {
                wasdTrainingMode = 'free';
                trainingCommandElement.style.display = 'none';
                currentTrainingKey = null;
                isWaitingForNextCommand = false;
                showNarration(t('已取消移动特训。', 'Canceled special training.'));
                return;
            }

            if (document.pointerLockElement === document.body && toyGun.visible && shootCooldown <= 0) {
                handleShooting();
            }
        }

        function loadStage(stageIndex) {
            if (fireworksInterval) { clearInterval(fireworksInterval); fireworksInterval = null; }
            if (warmupCountdownInterval) { clearInterval(warmupCountdownInterval); warmupCountdownInterval = null; }
            if (warmupTimerDisplayElement) warmupTimerDisplayElement.style.display = 'none';
            if (warmupConfirmOverlay) warmupConfirmOverlay.style.display = 'none';

            scene.background = new THREE.Color(0x87ceeb);
            scene.fog = new THREE.Fog(0x87ceeb, 0, 150);

            currentStage = stageIndex;
            stageCompletionFlag = false; 
            hasPlayerMoved = false;
            canPlayerMove = true;
            isPlayerDead = false;
            const customLevelForStage = isCustomStage(currentStage) ? getStoredCustomLevel() : null;
            const customGoalsForStage = customLevelForStage ? customLevelForStage.goals : {};
            
            playerHealth = maxPlayerHealth;
            updateHealthBar();
            const isTurretLevel = (currentStage >= 22 && currentStage <= 26) || !!customGoalsForStage.annihilation;
            const isSurvival = isSurvivalStage(currentStage);
            // Per-stage HP: Survival uses 5 HP, others default to 3
            maxPlayerHealth = isSurvival ? 5 : 3;
            playerHealth = maxPlayerHealth;
            updateHealthBar();
            healthContainer.style.display = (isTurretLevel || isSurvival) ? 'block' : 'none';
            // Hide gun in survival stages
if (toyGun) toyGun.visible = (stageIndex === 0 || isTurretLevel) && !isSurvival;
            
            crosshairElement.className = (isTurretLevel || isSurvival) ? 'crosshair-turret' : 'crosshair-default';

            const childrenToRemove = scene.children.filter(child => child !== camera);
            childrenToRemove.forEach(child => {
                child.traverse(object => {
                    if (object.isMesh) {
                        if (object.geometry) object.geometry.dispose();
                    }
                });
                scene.remove(child);
            });

            stageObjects = []; collidables = []; npcs = []; landmarks = []; turrets = [];
            animatedObjects = [];
            bullets = []; bulletHoles = []; firework3DParticles = []; trailParticles = []; 
            stage1Targets = []; aimedTargets.clear();
            shuttleRunState = {}; corridorState = {}; corridorTargets = []; activatedCorridorTargets.clear();
            wasdTrainingKeys = []; 
            wasdTrainingActivated = false;
            wasdCenterButton = null;
            wasdTrainingMode = null;
            currentTrainingKey = null;
            isWaitingForNextCommand = false;
            npcCounterElement.style.display = 'none';
            landmarkCounterElement.style.display = 'none';
            genericCounterElement.style.display = 'none';
            mapUsesCounterElement.style.display = 'none'; 
            scene.userData = {}; 
            
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambientLight);
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
            dirLight.position.set(-25, 35, 20);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            scene.add(dirLight);
            
            const isMinimapVisible = customLevelForStage
                ? (customLevelForStage.minimap.enabled && !customLevelForStage.minimap.staticEOnly)
                : (currentStage === 6 || (currentStage >= 9 && currentStage <= 26));
            minimapContainer.style.display = isMinimapVisible ? 'block' : 'none';
            if (customLevelForStage) resizeMinimap(customLevelForStage.minimap.size);
            else resizeMinimap(200);
            
            playerVelocity.set(0, 0, 0);
            isCrouching = false; 
            playerOnFloor = true; 
            
            resultsOverlay.style.display = 'none';
            trainingChoiceOverlay.style.display = 'none';
            trainingCommandElement.style.display = 'none';
            updateWarmupTargetSettingsUI();

            if (customLevelForStage) {
                setupCustomLevel(customLevelForStage);
            } else switch(currentStage) {
                case 0: setupStage0_Warmup(); break;
                case 1: setupStage1_Look(); break;
                case 2: setupStage3_ShuttleRun_Static(); break;
                case 3: setupStage4_ShuttleRun_Moving(); break;
                case 4: setupStage5_ShuttleRun_HighSpeed(); break;
                case 5: setupStage6_MissionCorridor(); break;
                case 6: setupStage7_Move(); break;
                case 7: setupStage8_Jump(); break;
                case 8: setupStage9_Skills(); break;
                case 9: setupStage10_Timed0(); break;
                case 10: setupStage11_Timed1(); break;
                case 11: setupStage12_Timed2(); break;
                case 12: setupStage13_Timed3(); break;
                case 13: setupStage14_Chase1(); break;
                case 14: setupStage15_Chase2(); break;
                case 15: setupStage16_Chase3(); break;
                case 16: setupStage17_Landmark1(); break;
                case 17: setupStage17_Landmark1_2(); break;
                case 18: setupStage18_Landmark2(); break;
                case 19: setupStage18_Landmark2_2(); break;
                case 20: setupStage19_Landmark3(); break;
                case 21: setupStage19_Landmark3_2(); break;
                case 22: setupStage22_TurretMaze1(); break;
                case 23: setupStage23_TurretMaze2(); break;
                case 24: setupStage24_TurretMaze3(); break;
                case 25: setupStage25_TurretMaze4(); break;
                case 26: setupStage26_TurretMaze5(); break;
                case 27: setupStage_Final(); break;
                case 28: setupStage28_Survival1(); break;
                case 29: setupStage29_Survival2(); break;
                case 30: setupStage30_Survival3(); break;
                case 31: setupStage31_Survival4(); break;
                case 32: setupStage32_Survival5(); break;
                }

            if (currentStage !== TOTAL_LEVELS) {
                updateInstructions();
                blockerElement.style.display = 'flex';
                instructionElement.style.display = 'block';
            }
            
            
updatePlayerInfoUI();
if (typeof isSurvivalStage === 'function' && isSurvivalStage(currentStage)) {
    // Survival: do not cancel the fresh timer started in setupSurvivalArena; just ensure UI is visible with target hint
    if (typeof timerElement !== 'undefined' && timerElement) {
        timerElement.style.display = 'block';
        const hintTarget = (scene && scene.userData && scene.userData.survivalTargetTime) ? scene.userData.survivalTargetTime : 30;
        try { timerElement.textContent = Number(hintTarget).toFixed(2) + 's'; } catch(e) { timerElement.textContent = "0.00s"; }
    }
} else {
    stopTimer();
    if (isTimedLevel(currentStage)) {
        timerElement.style.display = 'block';
        timerElement.textContent = "0.00s";
    }
}

        }
        
        
        // --- Survival Mode (Turret Arena) Helpers ---
        const SURVIVAL_STAGE_IDS = [28, 29, 30, 31, 32];
        function isSurvivalStage(stage) { return SURVIVAL_STAGE_IDS.includes(stage); }

        function isCustomStage(stage) { return stage === CUSTOM_STAGE_ID; }

        function resizeMinimap(size) {
            const nextSize = Math.max(120, Math.min(320, parseInt(size, 10) || 200));
            if (minimapContainer) {
                minimapContainer.style.width = `${nextSize}px`;
                minimapContainer.style.height = `${nextSize}px`;
            }
            if (minimap) {
                minimap.width = nextSize;
                minimap.height = nextSize;
            }
        }

        function isTimedLevel(stage) { return isCustomStage(stage) || (stage > 0 && stage < TOTAL_LEVELS); }

        function getStarRating(stage, time) {
            const thresholds = starTimeThresholds[stage];
            if (!thresholds) return 1;
            if (time <= thresholds.s3) return 3;
            if (time <= thresholds.s2) return 2;
            return 1;
        }

        function displayStars(starCount) {
            let starsHTML = '';
            for (let i = 0; i < 3; i++) {
                starsHTML += `<span class="${i < starCount ? 'star-filled' : 'star-empty'}">★</span>`;
            }
            return starsHTML;
        }

        function updatePlayerInfoUI() {
            if (!playerInfoElement) return;
            if (gameMode === 'campaign' && currentStage > 0 && currentStage < TOTAL_LEVELS) {
                const playerNameElement = document.getElementById('player-name');
                const playerStarsElement = document.getElementById('player-stars');
                playerNameElement.textContent = t(playerProfile.title, playerProfile.en_title || playerProfile.title);
                const currentStars = Object.values(levelStars).reduce((sum, stars) => sum + stars, 0);
                const totalStars = Object.keys(starTimeThresholds).length * 3;
                playerStarsElement.innerHTML = `${t('星星', 'Stars')}: ${currentStars} / ${totalStars} <span class="star-filled">★</span>`;
                playerInfoElement.style.display = 'block';
            } else {
                playerInfoElement.style.display = 'none';
            }
        }

        function updateInstructions() {
            let text = "";
            const enStyle = `font-size: 14px; color: #ccc;`;
            const clickContinueStyle = `font-size: 16px; margin-top: 20px; text-align: center; color: #ffdd57;`;
            const starContainer = document.getElementById('star-container');
            const instructionTextElement = document.getElementById('instruction-text');
            if (!instructionTextElement || !starContainer) return;
            starContainer.innerHTML = ''; 

            if (isPlayerDead) {
                 text = `您已被击败！<br><br><span style="${enStyle}">You have been defeated!</span><br><br><div style="${clickContinueStyle}">${t('点击以重新开始', 'Click to Restart')}</div>`;
            } else if (stageCompletionFlag) {
                const elapsedTime = (clock.getElapsedTime() - levelStartTime);
                let continueText;
                if (gameMode === 'campaign') {
                    const stars = levelStars[currentStage] || 1;
                    starContainer.innerHTML = displayStars(stars);
                    continueText = (currentStage < TOTAL_LEVELS) ? t("点击进入下一关", "Click for Next Level") : t("点击查看最终认证", "Click for Final Results");
                    text = `太棒了, ${playerProfile.title}！<br>训练完成！<br>用时: **${elapsedTime.toFixed(2)}** 秒<br><br><span style="${enStyle}">Great job, ${playerProfile.en_title}!<br>Training Complete!<br>Time: **${elapsedTime.toFixed(2)}** seconds</span><br><br><div style="${clickContinueStyle}">${continueText}</div>`;
                } else { 
                    recordTime(currentStage, elapsedTime);
                    continueText = t("点击返回菜单", "Click to Return to Menu");
                    text = `训练完成！<br>用时: **${elapsedTime.toFixed(2)}** 秒<br><br><span style="${enStyle}">Training Complete!<br>Time: **${elapsedTime.toFixed(2)}** seconds</span><br><br><div style="${clickContinueStyle}">${continueText}</div>`;
                }
            } else {
                let greeting = '';
                if (gameMode === 'campaign' && playerProfile.title) {
                    // This ensures profiles created before en_title was added still work.
                    if (!playerProfile.en_title) {
                        playerProfile.en_title = playerProfile.title.includes("叔叔") ? `Uncle ${playerProfile.nickname}` : `Auntie ${playerProfile.nickname}`;
                    }
                    greeting = `你好, ${playerProfile.title}。<br><span style="${enStyle}">Hello, ${playerProfile.en_title}.</span><br>`;
                }
                if (isCustomStage(currentStage)) {
                    const custom = scene.userData.customLevel || getStoredCustomLevel();
                    const goals = scene.userData.customGoals || custom.goals || {};
                    const goalTexts = [];
                    if (goals.reach) goalTexts.push(t('抵达终点', 'Reach the goal'));
                    if (goals.landmarks) goalTexts.push(t('按顺序触碰路标', 'Touch landmarks in order'));
                    if (goals.npc) goalTexts.push(t('触及所有NPC', 'Catch all NPCs'));
                    if (goals.annihilation) goalTexts.push(t('歼灭所有炮塔', 'Destroy all turrets'));
                    const mapHint = custom.minimap && custom.minimap.enabled
                        ? (custom.minimap.staticEOnly ? t('小地图按 E 显示/隐藏。', 'Press E to show/hide the minimap.') : t('小地图会显示在屏幕上，也可按 E 切换。', 'The minimap is visible; press E to toggle it.'))
                        : t('此关未启用小地图。', 'Minimap is disabled for this level.');
                    text = `**${custom.name || t('自定义关卡', 'Custom Level')}**<br>${goalTexts.join('<br>')}<br>${mapHint}<br><br><span style="${enStyle}">**${custom.name || 'Custom Level'}**<br>${goalTexts.join('<br>')}<br>${mapHint}</span>`;
                } else switch(currentStage) {
                case 28: case 29: case 30: case 31: case 32: {
                    
                    if (!isTimerRunning || levelStartTime === 0) { break; }
const elapsed = (clock.getElapsedTime() - levelStartTime);
                    if (elapsed >= (scene.userData.survivalTargetTime || 30)) {
                        shouldAdvance = true;
                    }
                } break;
                    case 0: text = `欢迎来到认知热身！<br>请熟悉 **WASD** 移动, **空格** 跳跃, **Shift** 下蹲。<br>用准星瞄准靶子, **点击鼠标左键** 射击。<br>熟悉后按 **ESC** 打开菜单进入训练。<br><br><span style="${enStyle}">Welcome to Cognitive Warm-up!<br>Use **WASD** to move, **Space** to jump, and **Shift** to crouch. Aim at targets and **Left-click** to shoot.<br>Press **ESC** to open the menu when ready.</span>`; break;
                    case 1: text = `${greeting}**注意力训练：定点聚焦**<br>请用准星瞄准所有 **红色** 目标。<br>已找到: ${aimedTargets.size} / 4<br><br><span style="${enStyle}">**Attention: Point Focus**<br>Aim at all **red** targets.<br>Found: ${aimedTargets.size} / 4</span>`; break;
                    case 2: text = `${greeting}**反应速度训练：瞬时响应**<br>请快速移动到亮起的 **红色** 目标处。<br>已完成: ${shuttleRunState.completedCount || 0} / 10<br><br><span style="${enStyle}">**Reaction: Quick Response**<br>Quickly move to the lit **red** target.<br>Completed: ${shuttleRunState.completedCount || 0} / 10</span>`; break;
                    case 3: text = `${greeting}**处理速度训练：动态追踪**<br>请追上并触碰移动的 **红色** 目标。<br>已完成: ${shuttleRunState.completedCount || 0} / 10<br><br><span style="${enStyle}">**Processing: Dynamic Tracking**<br>Chase and touch the moving **red** target.<br>Completed: ${shuttleRunState.completedCount || 0} / 10</span>`; break;
                    case 4: text = `${greeting}**预判能力训练：轨迹预测**<br>请预判并拦截高速移动的 **红色** 目标。<br>已完成: ${shuttleRunState.completedCount || 0} / 10<br><br><span style="${enStyle}">**Prediction: Trajectory Forecast**<br>Predict and intercept the fast-moving **red** target.<br>Completed: ${shuttleRunState.completedCount || 0} / 10</span>`; break;
                    case 5: text = `${greeting}**手眼协调训练：同步处理**<br>请在前进中用准星激活所有 **红色** 目标，并抵达终点。<br>已激活: ${activatedCorridorTargets.size} / ${corridorState.allTargets?.length || 0}<br><br><span style="${enStyle}">**Coordination: Synchronized Tasks**<br>Activate all **red** targets while moving and reach the end.<br>Activated: ${activatedCorridorTargets.size} / ${corridorState.allTargets.length || 0}</span>`; break;
                    case 6: text = `${greeting}**空间规划训练：蓝图导航**<br>请参考 **小地图** 的路线指引，找到终点。<br><br><span style="${enStyle}">**Spatial Planning: Blueprint Navigation**<br>Follow the route on the **minimap** to find the goal.</span>`; break;
                    case 7: text = `${greeting}**动作规划训练：节奏跨越**<br>请按下 **空格键**，按节奏跳过障碍，抵达终点。<br><br><span style="${enStyle}">**Motor Skills: Rhythmic Leap**<br>Press **Spacebar** to rhythmically jump over the obstacles to the goal.</span>`; break;
                    case 8: text = `${greeting}**认知灵活性训练：任务切换**<br>请综合运用**跳跃**和**下蹲(Shift)**穿过障碍，抵达终点。<br><br><span style="${enStyle}">**Cognitive Flexibility: Task Switching**<br>Use both **jumping** and **crouching (Shift)** to get to the goal.</span>`; break;
                    case 9: case 10: case 11: case 12: text = `${greeting}**工作记忆训练：迷宫速通 ${currentStage - 8}**<br>用最快的速度抵达终点！<br><br><span style="${enStyle}">**Working Memory: Maze Sprint ${currentStage - 8}**<br>Get to the finish line as fast as you can!</span>`; break;
                    case 13: case 14: case 15: text = `${greeting}**策略思维训练：动态博弈 ${currentStage - 12}**<br>迷宫里出现了动态目标！**在它们跑掉前捉住它们**！<br><br><span style="${enStyle}">**Strategic Thinking: Dynamic Chase ${currentStage - 12}**<br>Dynamic targets have appeared! **Catch them**!</span>`; break;
                    case 16: case 17: case 18: case 19: case 20: case 21: text = `${greeting}**顺序记忆训练：地标寻踪**<br>请按顺序找到所有地标！<br>移动后小地图会消失，按 **E键** 可暂停并查看地图（有次数限制）。<br><br><span style="${enStyle}">**Sequential Memory: Landmark Trace**<br>Find all landmarks in order!<br>Minimap disappears on move. Press **E** to pause and view map (limited uses).</span>`; break;
                    case 22: case 23: case 24: case 25: case 26: text = `${greeting}**风险决策训练：火线突围**<br>找到所有地标，同时要小心**防御塔**！<br>摧毁它们可以恢复1点HP并增加1次地图使用次数，也可以选择躲开攻击！<br><br><span style="${enStyle}">**Risk & Decision: Hazard Breakout**<br>Find all landmarks, but watch out for **turrets**!<br>Destroying them restores 1 HP and grants 1 map use. You can also evade their fire!</span>`; break;
                    case 28: case 29: case 30: case 31: case 32: 
                        const need = scene.userData.survivalTargetTime || 30;
                        text = `${greeting}**生存试炼：炮塔竞技**<br>在空旷场地中利用**小墙体**与**左右移动**躲避炮塔射击。<br>HP为5，每次命中-1。坚持 **${need} 秒** 即可通关。<br><br><span style="${enStyle}">**Survival: Turret Arena**<br>Use the small cover and strafe left/right to evade the turret. You have 5 HP; survive **${need} s** to win.</span>`; break;
                    case 27: text = ``; break;
                    default: text = t(`点击鼠标左键开始`, `Left Click to Start`); break;
                }
            }
            instructionTextElement.innerHTML = localizeBilingualHtml(text).replace(/\*\*(.*?)\*\*/g, '<span style="color: #ffdd57;">$1</span>');
        }


        function pauseTimer() { if (isTimerRunning) { isTimerRunning = false; timePausedAt = clock.getElapsedTime(); } }
        function resumeTimer() { if (isTimedLevel(currentStage)) { if (!isTimerRunning) { if (levelStartTime === 0) { levelStartTime = clock.getElapsedTime(); } else { const pauseDuration = clock.getElapsedTime() - timePausedAt; levelStartTime += pauseDuration; } isTimerRunning = true; } } }
        function stopTimer() { isTimerRunning = false; levelStartTime = 0; timePausedAt = 0; if (isTimedLevel(currentStage)) { timerElement.style.display = 'none'; } }

        function animate() {
            requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();
            const totalTime = clock.getElapsedTime();

            if (shootCooldown > 0) shootCooldown -= deltaTime;

            if (currentStage >= 2 && currentStage <= 4) {
                updateShuttleRunTargets(deltaTime);
            }
            if (currentStage >= 22 && currentStage <= 26) {
                updateTurrets(deltaTime);
            }
            if (isCustomStage(currentStage) && scene.userData.customGoals && scene.userData.customGoals.annihilation) {
                updateTurrets(deltaTime);
            }
            if (isSurvivalStage && isSurvivalStage(currentStage)) { updateTurrets(deltaTime); }

            animatedObjects.forEach(obj => {
                if (obj.userData.animation) {
                    obj.userData.animation(totalTime, deltaTime);
                }
            });

            updateBullets(deltaTime);
            updateBulletHoles(deltaTime);
            update3DFireworks(deltaTime);
            updateTrailParticles(deltaTime); 

            
if (isTimerRunning) {
    const elapsedTime = clock.getElapsedTime() - levelStartTime;
    if (typeof isSurvivalStage === 'function' && isSurvivalStage(currentStage)) {
        const target = (scene && scene.userData && scene.userData.survivalTargetTime) ? scene.userData.survivalTargetTime : 30;
        const remaining = Math.max(0, target - elapsedTime);
        timerElement.textContent = remaining.toFixed(2) + 's';
        if (!stageCompletionFlag && remaining <= 0.0001) {
            // Time's up: finish survival
            stageCompletionFlag = true;
            if (typeof stopTimer === 'function') stopTimer();
            // Disable turrets immediately
            if (Array.isArray(turrets)) {
                turrets.forEach(t => { if (t && t.userData) { t.userData.disabled = true; t.userData.fireCooldown = Infinity; } });
            }
            // Record and show results
            if (typeof recordTime === 'function') recordTime(currentStage, target);
            if (typeof saveProgress === 'function') saveProgress();
            if (typeof updatePlayerInfoUI === 'function') updatePlayerInfoUI();
            if (typeof updateInstructions === 'function') updateInstructions();
            if (typeof blockerElement !== 'undefined' && blockerElement) blockerElement.style.display = 'flex';
            if (document.pointerLockElement) { isTransitioning = true; document.exitPointerLock(); }
        }
    } else {
        timerElement.textContent = elapsedTime.toFixed(2) + 's';
    }
}

            
            if (minimapContainer.style.display === 'block') drawMinimap(); 
            
            if (document.pointerLockElement === document.body && !isPlayerDead) {
                updatePlayer(deltaTime);
                if (currentStage === 0) { 
                    handleWarmupAiming(); 
                    updateWasdTraining();
                }
                if (currentStage === 1) handleAiming();
                if (currentStage === 5) handleCorridorAiming();
                if ((currentStage >= 13 && currentStage <= 15) && npcs.length > 0) npcs.forEach(npc => updateNPC(npc, deltaTime));
                if (isCustomStage(currentStage) && scene.userData.customGoals && scene.userData.customGoals.npc && npcs.length > 0) npcs.forEach(npc => updateNPC(npc, deltaTime));
                checkStageCompletion();
                updateKeyDisplay();
            }

            if (camera.position.y < -30 && !isTransitioning) {
                handlePlayerDeath();
            }

            renderer.render(scene, camera);
        }

        function checkStageCompletion() {
            if (stageCompletionFlag || isTransitioning || isPlayerDead) return;
            let shouldAdvance = false;
            const playerPos = camera.position;
            if (isCustomStage(currentStage)) {
                shouldAdvance = checkCustomStageCompletion(playerPos);
            } else switch(currentStage) {
                case 28: case 29: case 30: case 31: case 32: {
                    const elapsed = (clock.getElapsedTime() - levelStartTime);
                    if (elapsed >= (scene.userData.survivalTargetTime || 30)) {
                        shouldAdvance = true;
                    }
                } break;
                case 1: if (stage1Targets.length > 0 && aimedTargets.size === stage1Targets.length) shouldAdvance = true; break;
                case 2: case 3: case 4:
                    if (shuttleRunState.activeTarget) {
                        if (playerPos.distanceTo(shuttleRunState.activeTarget.position) < 2.0) {
                            create3DFirework(shuttleRunState.activeTarget.position);
                            shuttleRunState.activeTarget.material = shuttleRunMaterials.yellow;
                            shuttleRunState.completedCount++;
                            updateGenericCounter(t(`已完成: ${shuttleRunState.completedCount} / 10`, `Completed: ${shuttleRunState.completedCount} / 10`));
                            updateInstructions();
                            if (shuttleRunState.completedCount >= shuttleRunState.targets.length) {
                                shouldAdvance = true;
                            } else {
                                activateNextShuttleTarget();
                            }
                        }
                    }
                    break;
                case 5:
                    const finishFlag5 = scene.getObjectByName("finish_flag");
                    const allTargetsHit = activatedCorridorTargets.size === corridorState.allTargets.length;
                    const playerAtEnd = finishFlag5 && playerPos.distanceTo(finishFlag5.position) < 3;
                    if (allTargetsHit && playerAtEnd) {
                        shouldAdvance = true;
                    }
                    break;
                case 6: 
                    const target6 = scene.getObjectByName("finish_flag");
                    if (target6 && playerPos.distanceTo(target6.position) < 3) shouldAdvance = true;
                    break;
                case 7: if (playerPos.z < -18) shouldAdvance = true; break;
                case 8: if (playerPos.z < -23) shouldAdvance = true; break;
                case 9: case 10: case 11: case 12:
                    const endPos = scene.userData.endPos;
                    if (endPos && playerPos.distanceTo(endPos) < 4) shouldAdvance = true;
                    break;
                case 13: case 14: case 15:
                    const playerPos2D = new THREE.Vector2(playerPos.x, playerPos.z);
                    for (let i = npcs.length - 1; i >= 0; i--) {
                        const npc = npcs[i];
                        if (playerPos2D.distanceTo(new THREE.Vector2(npc.position.x, npc.position.z)) < 2.5) {
                            scene.remove(npc); npcs.splice(i, 1); updateNpcCounter();
                        }
                    }
                    if (npcs.length === 0) shouldAdvance = true;
                    break;
                case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 23: case 24: case 25: case 26:
                    if (landmarks.length > 0 && nextLandmarkIndex < landmarks.length) {
                        const nextLandmark = landmarks[nextLandmarkIndex];
                        if (!nextLandmark.userData.isFound && playerPos.distanceTo(nextLandmark.position) < 3) {
                            nextLandmark.material.color.setHex(0x00ff00);
                            nextLandmark.material.emissive.setHex(0x008800);
                            nextLandmark.userData.isFound = true;
                            create3DFirework(nextLandmark.position);
                            nextLandmarkIndex++;
                            updateLandmarkCounter();
                            if (nextLandmarkIndex === landmarks.length) shouldAdvance = true;
                        }
                    }
                    break;
            }

            if (shouldAdvance) {
                stageCompletionFlag = true;
                pauseTimer();
                const elapsedTime = (clock.getElapsedTime() - levelStartTime);
                if (gameMode === 'campaign') {
                    if (currentStage >= unlockedLevel) {
                         let _unlock = currentStage + 1; if (_unlock === 6) _unlock = 7; unlockedLevel = Math.min(_unlock, TOTAL_LEVELS + 1);
                    }
                    const newStars = getStarRating(currentStage, elapsedTime);
                    if (!levelStars[currentStage] || newStars > levelStars[currentStage]) {
                        levelStars[currentStage] = newStars;
                    }
                    recordTime(currentStage, elapsedTime); 
                    saveProgress(); 
                    updatePlayerInfoUI();
                } else {
                    recordTime(currentStage, elapsedTime);
                    saveProgress();
                }
                updateInstructions();
                blockerElement.style.display = 'flex';
                if (document.pointerLockElement) { isTransitioning = true; document.exitPointerLock(); }
            }
        }

        function checkCustomStageCompletion(playerPos) {
            const custom = scene.userData.customLevel;
            const goals = scene.userData.customGoals || {};
            const state = scene.userData.customGoalState || {};
            if (!custom) return false;

            if (goals.reach && !state.reached) {
                const endPos = scene.userData.endPos || scene.getObjectByName("finish_flag")?.position;
                if (endPos && playerPos.distanceTo(endPos) < 3) {
                    state.reached = true;
                    create3DFirework(new THREE.Vector3(endPos.x, 1, endPos.z));
                }
            }

            if (goals.landmarks && !state.landmarks) {
                if (landmarks.length === 0) {
                    state.landmarks = true;
                } else if (nextLandmarkIndex < landmarks.length) {
                    const nextLandmark = landmarks[nextLandmarkIndex];
                    if (!nextLandmark.userData.isFound && playerPos.distanceTo(nextLandmark.position) < 3) {
                        nextLandmark.material.color.setHex(0x00ff00);
                        nextLandmark.material.emissive.setHex(0x008800);
                        nextLandmark.userData.isFound = true;
                        create3DFirework(nextLandmark.position);
                        nextLandmarkIndex++;
                        updateLandmarkCounter();
                    }
                    state.landmarks = nextLandmarkIndex >= landmarks.length;
                }
            }

            if (goals.npc && !state.npc) {
                const playerPos2D = new THREE.Vector2(playerPos.x, playerPos.z);
                for (let i = npcs.length - 1; i >= 0; i--) {
                    const npc = npcs[i];
                    if (playerPos2D.distanceTo(new THREE.Vector2(npc.position.x, npc.position.z)) < 2.5) {
                        scene.remove(npc);
                        npcs.splice(i, 1);
                        create3DFirework(npc.position);
                        updateNpcCounter();
                    }
                }
                state.npc = npcs.length === 0;
            }

            if (goals.annihilation && !state.annihilation) {
                state.annihilation = turrets.length === 0;
            }

            scene.userData.customGoalState = state;
            updateCustomGoalCounter();
            return (!goals.reach || state.reached)
                && (!goals.landmarks || state.landmarks)
                && (!goals.npc || state.npc)
                && (!goals.annihilation || state.annihilation);
        }

        function onWindowResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }
        
        function onKeyDown(event) {
            keys[event.code] = true;
            if (event.code === 'Escape') { 
			  event.preventDefault();
			  event.stopPropagation();
			  if (menuOverlay && menuOverlay.style.display === 'flex') {
				// Arm resume; actual pointer lock will be requested on ESC keyup
				resumeArm = true;
			  } else {
				// In-game -> pause via exiting pointer lock; UI handled by onPointerlockChange
				if (document.pointerLockElement === document.body) {
				  isTransitioning = true;
				  document.exitPointerLock();
				}
			  }
			  return;
			}
            if (event.code === 'KeyE' && isCustomStage(currentStage)) {
                handleCustomMinimapKey();
                return;
            }
            if (event.code === 'KeyE' && (currentStage >= 16 && currentStage <= 26)) {
                if (minimapUsesLeft > 0) {
                    if (minimapContainer.style.display === 'none') { 
                        minimapUsesLeft--;
                        updateMapUsesCounter();
                    }
                    canPlayerMove = false;
                    minimapContainer.style.display = 'block';
                } else {
                    if (minimapContainer.style.display === 'none') { 
                         showNarration(t('地图使用次数已用完！', 'No map uses left!'));
                    }
                }
            }
        }

        function onKeyUp(event) {
			// Handle ESC resume on keyup to avoid immediate pointer lock exit due to key being held
			if (event.code === 'Escape' && resumeArm) {
			  resumeArm = false;
			  if (menuOverlay && menuOverlay.style.display === 'flex') {
				resumeRequested = true;
				isTransitioning = true;
				try {
				  const el = document.body;
				  if (el && el.requestPointerLock) {
					if (el.focus) el.focus();
					// Delay request slightly to ensure key is fully released in the browser
					setTimeout(function(){
					  el.requestPointerLock();
					  // Fallback: if not locked soon, cancel request
					  setTimeout(function(){
						if (resumeRequested && document.pointerLockElement !== el) {
						  resumeRequested = false;
						  isTransitioning = false;
						}
					  }, 600);
					}, 40);
				  } else {
					resumeRequested = false;
					isTransitioning = false;
				  }
				} catch (e) {
				  resumeRequested = false;
				  isTransitioning = false;
				}
				return;
			  }
			}

            keys[event.code] = false;
            if (event.code === 'KeyE' && isCustomStage(currentStage)) {
                return;
            }
            if (event.code === 'KeyE' && (currentStage >= 16 && currentStage <= 26)) {
                canPlayerMove = true;
                if (hasPlayerMoved) minimapContainer.style.display = 'none';
            }
        }

        function handleCustomMinimapKey() {
            const custom = scene.userData.customLevel;
            if (!custom || !custom.minimap || !custom.minimap.enabled) return;
            const isVisible = minimapContainer.style.display === 'block';
            minimapContainer.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) drawMinimap();
        }

        // --- Helper Functions ---
        function createTexturesAndMaterials() {
            let canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            let ctx = canvas.getContext('2d');
            ctx.fillStyle = '#8d97ff';
            ctx.fillRect(0, 0, 512, 512);
            let imageData = ctx.getImageData(0, 0, 512, 512);
            let data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const randomFactor = (Math.random() - 0.5) * 30;
                data[i]   += randomFactor;
                data[i+1] += randomFactor;
                data[i+2] += randomFactor;
            }
            ctx.putImageData(imageData, 0, 0);
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 512; i += 64) {
                for (let j = 0; j < 512; j += 64) {
                    ctx.beginPath();
                    ctx.arc(i + 32, j + 32, 32, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            stonePathTexture = new THREE.CanvasTexture(canvas);
            stonePathTexture.wrapS = THREE.RepeatWrapping;
            stonePathTexture.wrapT = THREE.RepeatWrapping;

            canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            ctx = canvas.getContext('2d');
            ctx.fillStyle = '#233cff';
            ctx.fillRect(0, 0, 512, 512);
            imageData = ctx.getImageData(0, 0, 512, 512);
            data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const randomFactor = (Math.random() - 0.5) * 15;
                data[i] += randomFactor;
                data[i+1] += randomFactor;
                data[i+2] += randomFactor;
            }
            ctx.putImageData(imageData, 0, 0);
            ctx.strokeStyle = 'rgba(255, 234, 0, 0.38)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 512; i += 128) {
                ctx.beginPath();
                ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
            }
            metallicPatternFloorTexture = new THREE.CanvasTexture(canvas);
            metallicPatternFloorTexture.wrapS = THREE.RepeatWrapping;
            metallicPatternFloorTexture.wrapT = THREE.RepeatWrapping;

            canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            ctx = canvas.getContext('2d');
            ctx.fillStyle = '#c6f7ff'; ctx.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 60; i++) {
                const x = Math.random() * 256; const y = Math.random() * 256;
                const rX = Math.random() * 20 + 15; const rY = Math.random() * 20 + 15;
                const color = Math.floor(Math.random() * 50) + 155;
                ctx.fillStyle = `rgb(${color},${Math.max(120, color - 35)},255)`;
                ctx.beginPath(); ctx.ellipse(x, y, rX, rY, Math.random() * Math.PI, 0, 2 * Math.PI); ctx.fill();
            }
            shuttleRunStoneTexture = new THREE.CanvasTexture(canvas);
            shuttleRunStoneTexture.wrapS = THREE.RepeatWrapping;
            shuttleRunStoneTexture.wrapT = THREE.RepeatWrapping;

            canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            ctx = canvas.getContext('2d');
            ctx.fillStyle = '#263cff'; ctx.fillRect(0, 0, 256, 256);
            ctx.strokeStyle = '#ffea00'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.stroke();
            ctx.fillStyle = '#ff4f9f';
            for (let i = 0; i < 4; i++) {
                const cornerX = (i % 2) * 128; const cornerY = Math.floor(i / 2) * 128;
                ctx.beginPath(); ctx.arc(cornerX + 8, cornerY + 8, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cornerX + 120, cornerY + 8, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cornerX + 8, cornerY + 120, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cornerX + 120, cornerY + 120, 3, 0, Math.PI * 2); ctx.fill();
            }
            shuttleRunMetalTexture = new THREE.CanvasTexture(canvas);
            shuttleRunMetalTexture.wrapS = THREE.RepeatWrapping;
            shuttleRunMetalTexture.wrapT = THREE.RepeatWrapping;
            
            shuttleRunFloorTexture = createClassicalPatternTexture();
            missionCorridorFloorTexture = createSimpleGridTexture();

        }

        function createClassicalPatternTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f5f8ff';
            ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = 'rgba(255, 79, 159, 0.65)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const x = i * 128 + 64;
                    const y = j * 128 + 64;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(Math.PI / 4 * (i+j));
                    ctx.beginPath();
                    ctx.moveTo(0, -40);
                    ctx.quadraticCurveTo(20, -20, 0, 0);
                    ctx.quadraticCurveTo(-20, -20, 0, -40);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, 40);
                    ctx.quadraticCurveTo(20, 20, 0, 0);
                    ctx.quadraticCurveTo(-20, 20, 0, 40);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-40, 0);
                    ctx.quadraticCurveTo(-20, 20, 0, 0);
                    ctx.quadraticCurveTo(-20, -20, -40, 0);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(40, 0);
                    ctx.quadraticCurveTo(20, 20, 0, 0);
                    ctx.quadraticCurveTo(20, -20, 40, 0);
                    ctx.stroke();
                    ctx.restore();
                }
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            return texture;
        }

        function createSimpleGridTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#123cff';
            ctx.fillRect(0, 0, 256, 256);
            ctx.strokeStyle = 'rgba(255, 234, 0, 0.45)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 256; i += 32) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 256);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(256, i);
                ctx.stroke();
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            return texture;
        }

        const WALL_DIRECTION_COLORS = {
            east: 0xff00f5,
            west: 0x00f5ff,
            south: 0x39ff14,
            north: 0xff6a00,
            top: 0xffff00,
            bottom: 0x7c2cff
        };

        function createWallFaceMaterial(directionColor, sourceColor = 0xaaaaaa) {
            const wallMode = getEditorWallMode();
            if (wallMode === WALL_MATERIAL_MODES.IMAGE && editorWallTexture) {
                return new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    map: editorWallTexture,
                    emissive: 0x000000,
                    metalness: 0.92,
                    roughness: 0.2
                });
            }
            const selectedWallColor = wallMode === WALL_MATERIAL_MODES.COLOR
                ? (editorTextureSettings.wallColor || DEFAULT_WALL_COLOR)
                : '';
            const color = new THREE.Color(selectedWallColor || directionColor);
            if (sourceColor !== 0xaaaaaa) {
                color.lerp(new THREE.Color(sourceColor), selectedWallColor ? 0.06 : 0.14);
            }
            const emissive = color.clone().multiplyScalar(0.2);
            return new THREE.MeshStandardMaterial({
                color,
                emissive,
                metalness: 0.88,
                roughness: 0.14
            });
        }

        function createDirectionalWallMaterials(sourceColor = 0xaaaaaa) {
            return [
                createWallFaceMaterial(WALL_DIRECTION_COLORS.east, sourceColor),
                createWallFaceMaterial(WALL_DIRECTION_COLORS.west, sourceColor),
                createWallFaceMaterial(WALL_DIRECTION_COLORS.top, sourceColor),
                createWallFaceMaterial(WALL_DIRECTION_COLORS.bottom, sourceColor),
                createWallFaceMaterial(WALL_DIRECTION_COLORS.south, sourceColor),
                createWallFaceMaterial(WALL_DIRECTION_COLORS.north, sourceColor)
            ];
        }

        function createWallGemLights(x, y, z, width, height, depth) {
            if (!scene || height < 0.6) return;
            const lengthAxis = width >= depth ? 'x' : 'z';
            const length = lengthAxis === 'x' ? width : depth;
            if (length < 8 || height < 2.2) return;

            const compactWall = width <= 8 && depth <= 8;
            const stableHash = Math.abs(Math.floor(x * 31 + z * 17 + width * 13 + depth * 7));
            if (compactWall && stableHash % 10 !== 0) return;

            const gemColorHex = width > depth * 1.2
                ? (z >= 0 ? WALL_DIRECTION_COLORS.south : WALL_DIRECTION_COLORS.north)
                : depth > width * 1.2
                    ? (x >= 0 ? WALL_DIRECTION_COLORS.east : WALL_DIRECTION_COLORS.west)
                    : WALL_DIRECTION_COLORS.top;
            const gemCount = length >= 44 ? 2 : 1;
            const gemGroup = new THREE.Group();
            const crystalGeometry = new THREE.OctahedronGeometry(0.26, 1);
            const haloGeometry = new THREE.SphereGeometry(0.42, 16, 8);
            const ringGeometry = new THREE.TorusGeometry(0.34, 0.018, 8, 32);
            let gemIndex = 0;

            for (let i = 0; i < gemCount; i++) {
                const offset = gemCount === 1 ? 0 : -length / 4 + i * (length / 2);
                const gemColor = new THREE.Color(gemColorHex);
                const crystalMaterial = new THREE.MeshStandardMaterial({
                    color: gemColor,
                    emissive: gemColor,
                    emissiveIntensity: 1.45,
                    metalness: 0.62,
                    roughness: 0.05,
                    transparent: true,
                    opacity: 0.96
                });
                const haloMaterial = new THREE.MeshBasicMaterial({
                    color: gemColor,
                    transparent: true,
                    opacity: 0.16,
                    depthWrite: false
                });
                const ringMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    emissive: gemColor,
                    emissiveIntensity: 0.5,
                    metalness: 0.95,
                    roughness: 0.2
                });
                const lamp = new THREE.Group();
                const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
                const halo = new THREE.Mesh(haloGeometry, haloMaterial);
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = Math.PI / 2;
                crystal.castShadow = true;
                lamp.add(halo, crystal, ring);
                lamp.position.set(
                    lengthAxis === 'x' ? x + offset : x,
                    y + height / 2 + 0.78,
                    lengthAxis === 'x' ? z : z + offset
                );
                lamp.userData.baseY = lamp.position.y;
                lamp.userData.phase = gemIndex * 1.1 + stableHash * 0.01;
                gemGroup.add(lamp);

                const light = new THREE.PointLight(gemColorHex, 0.45, 5.5);
                light.position.copy(lamp.position);
                light.userData.followLamp = lamp;
                gemGroup.add(light);
                gemIndex++;
            }

            gemGroup.userData.animation = (time) => {
                gemGroup.children.forEach((item, index) => {
                    if (item.userData.followLamp) {
                        item.position.copy(item.userData.followLamp.position);
                        return;
                    }
                    if (!item.userData || typeof item.userData.baseY !== 'number') return;
                    item.position.y = item.userData.baseY + Math.sin(time * 1.3 + item.userData.phase) * 0.16;
                    item.rotation.y = time * 0.65 + index;
                    item.rotation.x = Math.sin(time * 0.9 + index) * 0.12;
                });
            };
            scene.add(gemGroup);
            stageObjects.push(gemGroup);
            animatedObjects.push(gemGroup);
        }

        function createWall(x, y, z, width, height, depth, color = 0xaaaaaa) {
            const g = new THREE.BoxGeometry(width, height, depth);
            const m = createDirectionalWallMaterials(color);
            const w = new THREE.Mesh(g, m);
            w.position.set(x, y, z);
            w.userData.isWall = true;
            w.userData.sourceColor = color;
            w.receiveShadow = true;
            w.castShadow = true;
            scene.add(w);
            stageObjects.push(w);
            collidables.push(w);
            createWallGemLights(x, y, z, width, height, depth);
            return w;
        }
        
        function createFloor(width, depth, material) {
            const g = new THREE.PlaneGeometry(width, depth);
            const floorMode = getEditorFloorMode();
            const m = (floorMode === FLOOR_MATERIAL_MODES.IMAGE && editorFloorTexture)
                ? new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    map: editorFloorTexture,
                    side: THREE.DoubleSide,
                    metalness: 0.58,
                    roughness: 0.26
                })
                : new THREE.MeshStandardMaterial({
                    color: editorTextureSettings.floorColor || DEFAULT_FLOOR_COLOR,
                    emissive: 0x103d18,
                    side: THREE.DoubleSide,
                    metalness: 0.32,
                    roughness: 0.34
                });
            const f = new THREE.Mesh(g, m);
            f.rotation.x = -Math.PI / 2;
            f.userData.isFloor = true;
            f.receiveShadow = true;
            scene.add(f);
            stageObjects.push(f);
        }

        function createFinishFlag(x, y, z) { const g = new THREE.Group(); const pg = new THREE.CylinderGeometry(0.1, 0.1, 4, 8); const pm = new THREE.MeshStandardMaterial({ color: 0x666666 }); const p = new THREE.Mesh(pg, pm); p.position.y = 2; g.add(p); const fg = new THREE.PlaneGeometry(1.5, 1); const fm = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide, emissive: 0x550000 }); const f = new THREE.Mesh(fg, fm); f.position.set(0.75, 3.5, 0); g.add(f); g.position.set(x, y, z); g.name = "finish_flag"; scene.add(g); stageObjects.push(g); return g; }
        
        function createHeartBalloon(x, y, z) {
            const balloonGroup = new THREE.Group();
            const heartShape = new THREE.Shape();
            const s = 0.8;
            heartShape.moveTo(0, 0.2 * s);
            heartShape.absarc( -0.4*s, 0.6*s, 0.4*s, Math.PI * 1.5, Math.PI * 0.5, true );
            heartShape.absarc( 0.4*s, 0.6*s, 0.4*s, Math.PI * 0.5, Math.PI * 1.5, true );

            const extrudeSettings = { steps: 2, depth: 0.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelOffset: 0, bevelSegments: 8 };
            const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
            const material = new THREE.MeshStandardMaterial({ color: 0xff004f, emissive: 0x880011, metalness: 0.4, roughness: 0.5 });
            const balloon = new THREE.Mesh(geometry, material);
            balloon.castShadow = true;
            balloonGroup.add(balloon);
            
            const stringGeo = new THREE.CylinderGeometry(0.02, 0.02, 3, 8);
            const stringMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
            const string = new THREE.Mesh(stringGeo, stringMat);
            string.position.y = -1.5;
            balloonGroup.add(string);

            balloonGroup.position.set(x, y + 4.5, z);
            
            balloonGroup.userData.animation = (time) => {
                balloonGroup.position.y = y + 4.5 + Math.sin(time * 1.5) * 0.5;
                balloonGroup.rotation.y = time * 0.3;
            };

            scene.add(balloonGroup);
            stageObjects.push(balloonGroup);
            animatedObjects.push(balloonGroup);
            return balloonGroup;
        }

        function createCapsule(r, h, c) {
            const g = new THREE.Group();
            const m = new THREE.MeshStandardMaterial({ color: c });
            const ch = h - (r * 2);
            const cg = new THREE.CylinderGeometry(r, r, ch, 32);
            const cyl = new THREE.Mesh(cg, m);
            cyl.castShadow = true;
            cyl.receiveShadow = true;
            g.add(cyl);
            const sg = new THREE.SphereGeometry(r, 32, 16);
            const ts = new THREE.Mesh(sg, m);
            ts.position.y = ch / 2;
            ts.castShadow = true;
            ts.receiveShadow = true;
            g.add(ts);
            const bs = new THREE.Mesh(sg, m);
            bs.position.y = -ch / 2;
            bs.castShadow = true;
            bs.receiveShadow = true;
            g.add(bs);
            g.velocity = new THREE.Vector3();
            g.userData.npcRadius = r;
            g.userData.npcHeight = h;
            g.userData.stuckTimer = 0;
            g.userData.lastPosition = null;
            return g;
        }
        function createCircularTarget() {
            const g = new THREE.Group();
            g.name = "warmup_target";
            const rings = [{ c: 0xffffff, r: 1.5 }, { c: 0xffffff, r: 1.3 }, { c: 0x000000, r: 1.1 }, { c: 0x000000, r: 0.9 }, { c: 0x87CEEB, r: 0.7 }, { c: 0x87CEEB, r: 0.5 }, { c: 0xFF4500, r: 0.4 }, { c: 0xFF4500, r: 0.3 }, { c: 0xFFD700, r: 0.2 }, { c: 0xFFD700, r: 0.1 }];
            for (let i = 0; i < rings.length; i++) {
                const ring = rings[i];
                let geo;
                if (i === rings.length - 1) {
                    geo = new THREE.CircleGeometry(ring.r, 32);
                } else {
                    geo = new THREE.RingGeometry(rings[i + 1].r, ring.r, 32);
                }
                const mat = new THREE.MeshStandardMaterial({ color: ring.c, side: THREE.DoubleSide, emissive: 0x000000 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.z = i * 0.001;
                mesh.userData.isTargetRing = true;
                g.add(mesh);
                stageObjects.push(mesh);
                collidables.push(mesh);
            }
            const sg = new THREE.BoxGeometry(0.1, 1.5, 0.1);
            const sm = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const s = new THREE.Mesh(sg, sm);
            s.position.y = -0.75;
            s.position.z = -0.1;
            g.add(s);
            g.position.set(0, 2, -12);
            g.userData.basePosition = g.position.clone();
            g.userData.animation = (time) => {
                const base = g.userData.basePosition;
                if (warmupTargetSettings.moving) {
                    const speed = warmupTargetSettings.speed;
                    g.position.x = base.x + Math.sin(time * speed) * 4.2;
                    g.position.y = base.y + Math.sin(time * speed * 1.4) * 0.55;
                    g.position.z = base.z + Math.cos(time * speed * 0.75) * 1.6;
                } else {
                    g.position.copy(base);
                }
                g.rotation.y = Math.sin(time * 0.8) * 0.12;
            };
            scene.add(g);
            stageObjects.push(g);
            animatedObjects.push(g);
            collidables.push(g);
        }
        function createLandmark(x, z, num) { const lg = new THREE.CylinderGeometry(1, 1, 0.5, 32); const lm = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xccaa00, transparent: true, opacity: 0.8 }); const l = new THREE.Mesh(lg, lm); l.position.set(x, 0.25, z); l.userData = { isLandmark: true, number: num, isFound: false }; scene.add(l); stageObjects.push(l); landmarks.push(l); const loader = new THREE.FontLoader(); loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => { const tg = new THREE.TextGeometry(num.toString(), { font: font, size: 0.8, height: 0.1 }); tg.computeBoundingBox(); const tm = new THREE.MeshBasicMaterial({ color: 0x000000 }); const t = new THREE.Mesh(tg, tm); t.position.x = -0.5 * (tg.boundingBox.max.x - tg.boundingBox.min.x); t.position.y = 0.3; t.rotation.x = -Math.PI / 2; l.add(t); }); return l; }
        function createInstructionText(text, font, position, color = 0xffffff) { const textLines = text.split('\n'); const textGroup = new THREE.Group(); const textMat = new THREE.MeshBasicMaterial({ color: color }); textLines.forEach((line, index) => { const textGeo = new THREE.TextGeometry(line, { font: font, size: 0.3, height: 0.01 }); textGeo.computeBoundingBox(); const textMesh = new THREE.Mesh(textGeo, textMat); textMesh.position.x = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x); textMesh.position.y = -index * 0.4; textGroup.add(textMesh); }); textGroup.position.copy(position); textGroup.rotation.x = -Math.PI / 2; scene.add(textGroup); stageObjects.push(textGroup); return textGroup; }
        function createPracticeAreaLayout(withObstacles = true) { createFloor(30, 30); createWall(0, 2.5, -15, 30, 5, 0.2); createWall(0, 2.5, 15, 30, 5, 0.2); createWall(-15, 2.5, 0, 0.2, 5, 30); createWall(15, 2.5, 0, 0.2, 5, 30); if (withObstacles) { const oW = 30, oH = 1.2, oD = 0.2; for (let i = 0; i < 5; i++) { createWall(0, oH / 2, -2 - (i * 2), oW, oH, oD, 0xcc5555); } } }

        function setupCustomLevel(level) {
            const custom = sanitizeCustomLevel(level);
            const cell = 5;
            const mapWidth = custom.cols * cell;
            const mapDepth = custom.rows * cell;
            const offsetX = -mapWidth / 2;
            const offsetZ = -mapDepth / 2;
            const cellCenter = (gridCell) => new THREE.Vector3(
                gridCell.c * cell + offsetX + cell / 2,
                0,
                gridCell.r * cell + offsetZ + cell / 2
            );

            createFloor(mapWidth, mapDepth);
            for (let r = 0; r < custom.rows; r++) {
                for (let c = 0; c < custom.cols; c++) {
                    if (custom.grid[r][c] === 1) {
                        const pos = cellCenter({ r, c });
                        createWall(pos.x, 2.5, pos.z, cell, 5, cell);
                    }
                }
            }

            const startPos = cellCenter(custom.start);
            camera.position.set(startPos.x, playerHeight, startPos.z);
            camera.quaternion.set(0, 0, 0, 1);
            euler.set(0, 0, 0, 'YXZ');
            camera.quaternion.setFromEuler(euler);

            let endPos = null;
            if (custom.goals.reach) {
                const finishPos = cellCenter(custom.finish);
                endPos = new THREE.Vector3(finishPos.x, 0, finishPos.z);
                createFinishFlag(finishPos.x, 0, finishPos.z);
            }

            if (custom.goals.landmarks) {
                custom.landmarks.forEach((gridCell, index) => {
                    const pos = cellCenter(gridCell);
                    createLandmark(pos.x, pos.z, index + 1);
                });
                landmarkCounterElement.style.display = landmarks.length > 0 ? 'block' : 'none';
            }

            if (custom.goals.npc) {
                custom.npcs.forEach(gridCell => {
                    const pos = cellCenter(gridCell);
                    const npc = createCapsule(0.4, 1.8, 0x0099ff);
                    npc.position.set(pos.x, 0.9, pos.z);
                    scene.add(npc);
                    npcs.push(npc);
                    stageObjects.push(npc);
                });
                scene.userData.totalNpcs = npcs.length;
                npcCounterElement.style.display = npcs.length > 0 ? 'block' : 'none';
            }

            if (custom.goals.annihilation) {
                custom.turrets.forEach(gridCell => {
                    const pos = cellCenter(gridCell);
                    createTurret(pos.x, pos.z);
                });
                genericCounterElement.style.display = 'block';
            }

            scene.userData.customLevel = custom;
            scene.userData.customGoals = custom.goals;
            scene.userData.customGoalState = { reached: !custom.goals.reach, landmarks: !custom.goals.landmarks, npc: !custom.goals.npc, annihilation: !custom.goals.annihilation };
            scene.userData.mazeLayout = custom.grid;
            scene.userData.mazeRows = custom.rows;
            scene.userData.mazeCols = custom.cols;
            scene.userData.cellSize = cell;
            scene.userData.endPos = endPos;
            scene.userData.startPos = new THREE.Vector3(startPos.x, 0, startPos.z);
            updateCustomGoalCounter();
        }
        
        function createCourtyardLamp(x, y, z) {
            const lampGroup = new THREE.Group();
            const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.5 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.y = 0.75;
            lampGroup.add(pole);
            const headGeo = new THREE.SphereGeometry(0.2, 16, 8);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0xffffaa, emissiveIntensity: 1 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 1.5;
            lampGroup.add(head);
            const pointLight = new THREE.PointLight(0xfff0d1, 2, 8);
            pointLight.position.y = 1.5;
            pointLight.castShadow = true; 
            lampGroup.add(pointLight);
            lampGroup.position.set(x, y, z);
            lampGroup.castShadow = true;
            markNPCPassThrough(lampGroup);
            scene.add(lampGroup);
            stageObjects.push(lampGroup);
        }

        function markNPCPassThrough(object) {
            object.userData.npcPassThrough = true;
            object.traverse(child => {
                child.userData.npcPassThrough = true;
            });
        }
        
        function createStreetLight(x, y, z) {
            const lightGroup = new THREE.Group();
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x4B4B4B, metalness: 0.9, roughness: 0.5 });
            const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 3.5, 8);
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.y = 1.75;
            pole.castShadow = true;
            lightGroup.add(pole);
            const armGeo = new THREE.BoxGeometry(0.15, 0.15, 1);
            const arm = new THREE.Mesh(armGeo, poleMat);
            arm.position.set(0, 3.3, 0.5);
            lightGroup.add(arm);
            const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0xffffaa, emissiveIntensity: 1.5 });
            const lampHeadGeo = new THREE.BoxGeometry(0.3, 0.2, 0.3);
            const lampHead = new THREE.Mesh(lampHeadGeo, lampHeadMat);
            lampHead.position.set(0, 3.1, 0.85);
            lightGroup.add(lampHead);
            const pointLight = new THREE.PointLight(0xfff0d1, 0.01, 15);
            pointLight.position.set(0, 3.0, 0.85);
            pointLight.castShadow = false;
            lightGroup.add(pointLight);
            lightGroup.position.set(x, y, z);
            markNPCPassThrough(lightGroup);
            scene.add(lightGroup);
            stageObjects.push(lightGroup);
            return lightGroup;
        }

        function setupStage0_Warmup() { 
            camera.position.set(0, playerHeight, 10); 
            camera.quaternion.set(0, 0, 0, 1); 
            euler.set(0, 0, 0, 'YXZ'); 
            createPracticeAreaLayout(); 
            createCircularTarget(); 
            const loader = new THREE.FontLoader(); 
            loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', function (font) { 
                const textMaterial = new THREE.MeshStandardMaterial({ color: 0xFFE65A, metalness: 0.8, roughness: 0.4, emissive: 0xFFB300, emissiveIntensity: 0.4 }); 
                const textGeo = new THREE.TextGeometry('Welcome', { font: font, size: 1.5, height: 0.3, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelOffset: 0, bevelSegments: 5 }); 
                textGeo.computeBoundingBox(); 
                const textMesh = new THREE.Mesh(textGeo, textMaterial); 
                textMesh.position.set(-0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x), 4, 0);
                textMesh.castShadow = true; 
                textMesh.name = "welcome_text";
                animatedObjects.push({ userData: { animation: (time) => { textMesh.position.y = 4 + Math.sin(time * 1.5) * 0.2; textMesh.rotation.y = Math.sin(time * 0.5) * 0.2; } } });
                scene.add(textMesh); 
                stageObjects.push(textMesh); 

                createWasdTrainingArea(font);
                
                const skillGroup = new THREE.Group();
                skillGroup.name = "skill_device";
                const pinkColor = 0xff88cc;
                const jumpObstacle = createWall(10, 0.5, 5, 2, 1, 2, 0xff8c00);
                const jumpText = createInstructionText(' Jump\n(Space + W/A/S/D)', font, new THREE.Vector3(10, 0.01, 7), pinkColor);
                
                const crouchObstacleTop = createWall(10, 1.5, 0, 2.2, 0.2, 0.2, 0x708090);
                const crouchObstacleLeft = createWall(8.9, 0.75, 0, 0.2, 1.5, 0.2, 0x708090);
                const crouchObstacleRight = createWall(11.1, 0.75, 0, 0.2, 1.5, 0.2, 0x708090);
                const crouchText = createInstructionText(' Crouch\n(Shift + W/A/S/D)', font, new THREE.Vector3(10, 0.01, 2), pinkColor);
                
                skillGroup.add(jumpObstacle, jumpText, crouchObstacleTop, crouchObstacleLeft, crouchObstacleRight, crouchText);
                scene.add(skillGroup);
                stageObjects.push(skillGroup);
                collidables.push(jumpObstacle, crouchObstacleTop, crouchObstacleLeft, crouchObstacleRight);
            }); 
            if (gameMode === 'campaign') {
                startWarmupCountdown();
            }
        }

        function startWarmupCountdown() {
            if (warmupCountdownInterval) clearInterval(warmupCountdownInterval);
            
            let countdown = 30;
            warmupTimerDisplayElement.style.display = 'block';
            warmupTimerDisplayElement.textContent = `${t('第一关训练倒计时', 'First training countdown')}: ${countdown}s`;

            warmupCountdownInterval = setInterval(() => {
                countdown--;
                warmupTimerDisplayElement.textContent = `${t('第一关训练倒计时', 'First training countdown')}: ${countdown}s`;

                if (countdown <= 0) {
                    clearInterval(warmupCountdownInterval);
                    warmupCountdownInterval = null;
                    warmupTimerDisplayElement.style.display = 'none';
                    if (document.pointerLockElement) document.exitPointerLock();
                    warmupConfirmOverlay.style.display = 'flex';
                }
            }, 1000);
        }

        function createWasdTrainingArea(font) {
            const wasdGroup = new THREE.Group();
            wasdGroup.name = "wasd_device";
            const areaCenter = new THREE.Vector3(-10, 0.01, 5);
            const keySize = 2;
            const keySpacing = 2.5;
            const inactiveMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.8 });
            const activeMat = new THREE.MeshStandardMaterial({ color: 0xFFFF00, emissive: 0xFFFF00, emissiveIntensity: 0.8 });
            const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const centerGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
            const centerInactiveMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 });
            const centerActiveMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 });
            const centerButtonMesh = new THREE.Mesh(centerGeo, centerInactiveMat.clone());
            centerButtonMesh.position.set(areaCenter.x, 0.1, areaCenter.z);
            centerButtonMesh.castShadow = true;
            wasdGroup.add(centerButtonMesh);
            wasdCenterButton = {
                mesh: centerButtonMesh,
                boundingBox: new THREE.Box3().setFromObject(centerButtonMesh),
                inactiveMaterial: centerInactiveMat,
                activeMaterial: centerActiveMat
            };
            const createKey = (letter, position) => {
                const keyGroup = new THREE.Group();
                keyGroup.position.copy(position);
                const planeGeo = new THREE.PlaneGeometry(keySize, keySize);
                const plane = new THREE.Mesh(planeGeo, inactiveMat.clone());
                plane.rotation.x = -Math.PI / 2;
                plane.receiveShadow = true;
                keyGroup.add(plane);
                collidables.push(plane);
                const textGeo = new THREE.TextGeometry(letter, { font: font, size: 1, height: 0.1 });
                textGeo.computeBoundingBox();
                const text = new THREE.Mesh(textGeo, textMat);
                text.position.set(-0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x), 0.05, 0.5);
                text.rotation.x = -Math.PI / 2;
                keyGroup.add(text);
                wasdGroup.add(keyGroup);
                keyGroup.updateMatrixWorld(true);
                wasdTrainingKeys.push({
                    letter: letter,
                    mesh: plane,
                    boundingBox: new THREE.Box3().setFromObject(keyGroup),
                    inactiveMaterial: plane.material,
                    activeMaterial: activeMat
                });
            };
            createKey('W', new THREE.Vector3(areaCenter.x, areaCenter.y, areaCenter.z - keySpacing));
            createKey('A', new THREE.Vector3(areaCenter.x - keySpacing, areaCenter.y, areaCenter.z));
            createKey('S', new THREE.Vector3(areaCenter.x, areaCenter.y, areaCenter.z + keySpacing));
            createKey('D', new THREE.Vector3(areaCenter.x + keySpacing, areaCenter.y, areaCenter.z));
            scene.add(wasdGroup);
            stageObjects.push(wasdGroup);
        }

        function startNextTrainingCommand() {
            const keys = ['W', 'A', 'S', 'D'];
            currentTrainingKey = keys[Math.floor(Math.random() * keys.length)];
            isWaitingForNextCommand = false;
            let direction_zh, direction_en;
            switch(currentTrainingKey) {
                case 'W': direction_zh = '前'; direction_en = 'Forward'; break;
                case 'A': direction_zh = '左'; direction_en = 'Left'; break;
                case 'S': direction_zh = '后'; direction_en = 'Backward'; break;
                case 'D': direction_zh = '右'; direction_en = 'Right'; break;
            }
            trainingCommandElement.innerHTML = t(
                `请移动到：${direction_zh} (${currentTrainingKey})<br><br><span style="font-size:12px; color: #aaa;">点击鼠标左键可随时取消</span>`,
                `Please move to: ${direction_en} (${currentTrainingKey})<br><br><span style="font-size:12px; color: #aaa;">Left-click to cancel anytime</span>`
            );
            trainingCommandElement.style.display = 'block';
        }

        function updateWasdTraining() {
            if (!wasdCenterButton) return;
            const playerPos = camera.position;

            if (!wasdTrainingActivated) {
                const box = wasdCenterButton.boundingBox;
                if (playerPos.x >= box.min.x && playerPos.x <= box.max.x &&
                    playerPos.z >= box.min.z && playerPos.z <= box.max.z) {
                    wasdTrainingActivated = true;
                    wasdCenterButton.mesh.material = wasdCenterButton.activeMaterial;
                    create3DFirework(wasdCenterButton.mesh.position);
                    if (document.pointerLockElement) document.exitPointerLock();
                    trainingChoiceOverlay.style.display = 'flex';
                }
                return;
            }

            if (!wasdTrainingMode) return;

            if (wasdTrainingMode === 'special') {
                if (!isWaitingForNextCommand) {
                    const correctKey = wasdTrainingKeys.find(k => k.letter === currentTrainingKey);
                    if (correctKey) {
                        const box = correctKey.boundingBox;
                        const isPlayerOnCorrectKey = playerPos.x >= box.min.x && playerPos.x <= box.max.x &&
                                                     playerPos.z >= box.min.z && playerPos.z <= box.max.z;
                        if (isPlayerOnCorrectKey) {
                            isWaitingForNextCommand = true;
                            trainingCommandElement.innerHTML = t(
                                `太棒了！请返回中心红色按钮<br><br><span style="font-size:12px; color: #aaa;">点击鼠标左键可随时取消</span>`,
                                `Great! Please return to the red button<br><br><span style="font-size:12px; color: #aaa;">Left-click to cancel anytime</span>`
                            );
                        }
                    }
                } 
                else {
                    const box = wasdCenterButton.boundingBox;
                    const isPlayerOnCenter = playerPos.x >= box.min.x && playerPos.x <= box.max.x &&
                                             playerPos.z >= box.min.z && playerPos.z <= box.max.z;
                    if (isPlayerOnCenter) {
                        startNextTrainingCommand();
                    }
                }
            }

            wasdTrainingKeys.forEach(key => {
                const box = key.boundingBox;
                const isPlayerOnKey = playerPos.x >= box.min.x && playerPos.x <= box.max.x &&
                                      playerPos.z >= box.min.z && playerPos.z <= box.max.z;
                
                let shouldBeLit = false;
                if (isPlayerOnKey) {
                    if (wasdTrainingMode === 'free') {
                        shouldBeLit = true;
                    } else if (wasdTrainingMode === 'special') {
                        if (key.letter === currentTrainingKey) {
                            shouldBeLit = true;
                        }
                    }
                }
                key.mesh.material = shouldBeLit ? key.activeMaterial : key.inactiveMaterial;
            });
            
            if (wasdTrainingMode === 'special' && isWaitingForNextCommand) {
                 wasdCenterButton.mesh.material = wasdCenterButton.activeMaterial;
            } else {
                 wasdCenterButton.mesh.material = wasdCenterButton.inactiveMaterial;
            }
        }

        function setupStage1_Look() { camera.position.set(0, playerHeight, 5); camera.quaternion.set(0, 0, 0, 1); euler.set(0, 0, 0, 'YXZ'); createFloor(20, 20); createWall(0, 2.5, -10, 20, 5, 0.2); createWall(0, 2.5, 10, 20, 5, 0.2); createWall(-10, 2.5, 0, 0.2, 5, 20); createWall(10, 2.5, 0, 0.2, 5, 20); const targetPositions = [new THREE.Vector3(0, 1.5, -8), new THREE.Vector3(8, 2, 0), new THREE.Vector3(-7, 1, 3), new THREE.Vector3(0, 3, 8)]; targetPositions.forEach(pos => { const targetGeo = new THREE.SphereGeometry(0.5, 32, 32); const targetMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 }); const target = new THREE.Mesh(targetGeo, targetMat); target.position.copy(pos); target.userData.isTarget = true; scene.add(target); stageObjects.push(target); stage1Targets.push(target); }); updateInstructions(); }
        
        function setupShuttleRunLevel(isMoving, speed) {
            camera.position.set(0, playerHeight, 0);
            camera.quaternion.set(0, 0, 0, 1);
            euler.set(0, 0, 0, 'YXZ');
            
            scene.background = new THREE.Color(0x4a4a6a);
            scene.fog = new THREE.Fog(0x4a4a6a, 0, 100);
            
            const mapSize = 80;
            
            // MODIFICATION: Changed floor texture to missionCorridorFloorTexture
            missionCorridorFloorTexture.repeat.set(mapSize / 4, mapSize / 4);
            missionCorridorFloorTexture.needsUpdate = true;
            const floorMaterial = new THREE.MeshStandardMaterial({
                map: missionCorridorFloorTexture,
                metalness: 0,
                roughness: 0.8
            });
            createFloor(mapSize, mapSize, floorMaterial);

            createPillarsForShuttleRun(20, mapSize / 2 - 5);
            createShuttleRunWalls(mapSize); 

            shuttleRunMaterials = {
                green: new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x005500 }),
                red: new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x880000 }),
                yellow: new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x888800 }),
            };

            const targets = [];
            const spawnRadius = mapSize / 2 - 10; 
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 5 + Math.random() * (spawnRadius - 5);
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                
                const buttonGeo = new THREE.CylinderGeometry(1, 1, 0.4, 32);
                const button = new THREE.Mesh(buttonGeo, shuttleRunMaterials.green.clone());
                button.position.set(x, 0.2, z);
                button.castShadow = true;
                if (isMoving) {
                    button.velocity = new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize().multiplyScalar(speed);
                    button.userData.trailTimer = 0; 
                }
                scene.add(button);
                stageObjects.push(button);
                targets.push(button);
            }

            shuttleRunState = {
                targets: targets,
                activeTarget: null,
                completedCount: 0,
                availableIndices: [...Array(10).keys()],
                spawnRadius: spawnRadius
            };
            
            genericCounterElement.style.display = 'block';
            updateGenericCounter(t(`已完成: 0 / 10`, `Completed: 0 / 10`));
            
            activateNextShuttleTarget();
        }

        function createShuttleRunWalls(mapSize) {
            const wallHeight = 20;
            const thickness = 0.35;
            createWall(0, wallHeight / 2, -mapSize / 2, mapSize, wallHeight, thickness);
            createWall(0, wallHeight / 2, mapSize / 2, mapSize, wallHeight, thickness);
            createWall(mapSize / 2, wallHeight / 2, 0, thickness, wallHeight, mapSize);
            createWall(-mapSize / 2, wallHeight / 2, 0, thickness, wallHeight, mapSize);
        }

        function createPillarsForShuttleRun(count, radius) {
            for(let i = 0; i < count; i++) {
                const pillarGroup = new THREE.Group();

                const baseGeo = new THREE.CylinderGeometry(0.8, 1, 0.5, 16);
                const baseMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.8, roughness: 0.3 });
                const base = new THREE.Mesh(baseGeo, baseMat);
                base.position.y = 0.25;
                pillarGroup.add(base);

                const bodyGeo = new THREE.CylinderGeometry(0.5, 0.7, 8, 16);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.6, roughness: 0.5 });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = 4.5; 
                pillarGroup.add(body);

                const topGeo = new THREE.IcosahedronGeometry(0.6, 0);
                const topMat = new THREE.MeshStandardMaterial({ 
                    color: 0x00ffff, 
                    emissive: 0x00ffff, 
                    emissiveIntensity: 1.5,
                    metalness: 0.2,
                    roughness: 0.1
                });
                const top = new THREE.Mesh(topGeo, topMat);
                top.position.y = 9; 
                pillarGroup.add(top);
                
                const ringGeo = new THREE.TorusGeometry(0.8, 0.05, 8, 32);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2;
                ring.position.y = 1; 
                pillarGroup.add(ring);
                
                ring.userData.animation = (time) => {
                    ring.position.y = 1 + (Math.sin(time * 2 + i) + 1) / 2 * 7; 
                    ring.material.opacity = 0.5 + (Math.sin(time * 2 + i) + 1) / 4;
                };
                animatedObjects.push(ring);

                const angle = Math.random() * Math.PI * 2;
                const r = 10 + Math.random() * (radius - 10);
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                pillarGroup.position.set(x, 0, z);

                pillarGroup.castShadow = true;
                pillarGroup.receiveShadow = true;
                
                scene.add(pillarGroup);
                stageObjects.push(pillarGroup);
                collidables.push(body); 
            }
        }

        function setupStage3_ShuttleRun_Static() { setupShuttleRunLevel(false, 0); }
        function setupStage4_ShuttleRun_Moving() { setupShuttleRunLevel(true, 2.5); }
        function setupStage5_ShuttleRun_HighSpeed() { setupShuttleRunLevel(true, 5.0); }

        function updateShuttleRunTargets(deltaTime) {
            if (!shuttleRunState.targets) return;
            const radius = shuttleRunState.spawnRadius;
            shuttleRunState.targets.forEach(target => {
                if (target.velocity) {
                    target.position.add(target.velocity.clone().multiplyScalar(deltaTime));
                    
                    if (target.position.x > radius || target.position.x < -radius) {
                        target.velocity.x *= -1;
                        target.position.x = Math.sign(target.position.x) * radius;
                    }
                    if (target.position.z > radius || target.position.z < -radius) {
                        target.velocity.z *= -1;
                        target.position.z = Math.sign(target.position.z) * radius;
                    }

                    if (target === shuttleRunState.activeTarget) {
                        target.userData.trailTimer += deltaTime;
                        if (target.userData.trailTimer > 0.05) {
                            target.userData.trailTimer = 0;
                            createTrailParticle(target.position);
                        }
                    }
                }
            });
        }

        function activateNextShuttleTarget() {
            if (shuttleRunState.availableIndices.length === 0) {
                shuttleRunState.activeTarget = null;
                return;
            }
            const randomIndex = Math.floor(Math.random() * shuttleRunState.availableIndices.length);
            const targetIndex = shuttleRunState.availableIndices.splice(randomIndex, 1)[0];
            
            const newTarget = shuttleRunState.targets[targetIndex];
            newTarget.material = shuttleRunMaterials.red;
            shuttleRunState.activeTarget = newTarget;
        }

        function setupStage6_MissionCorridor() {
            camera.position.set(0, playerHeight, 48);
            camera.quaternion.set(0, 0, 0, 1);
            euler.set(0, 0, 0, 'YXZ'); 
            
            const corridorLength = 100;
            const corridorWidth = 30;
            
            missionCorridorFloorTexture.repeat.set(corridorWidth / 4, corridorLength / 4);
            missionCorridorFloorTexture.needsUpdate = true;
            const floorMaterial = new THREE.MeshStandardMaterial({
                map: missionCorridorFloorTexture,
            });
            createFloor(corridorWidth, corridorLength, floorMaterial);
            createFinishFlag(0, 0, -49);

            const allTargets = [];
            activatedCorridorTargets.clear();
            const sphereGeo = new THREE.SphereGeometry(0.5, 32, 16);
            
            for(let i = 0; i < 8; i++) {
                const sphereMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 });
                const sphere = new THREE.Mesh(sphereGeo, sphereMat);
                const randomHeight = playerHeight + (Math.random() * playerHeight);
                sphere.position.set(-corridorWidth / 2.2, randomHeight, 40 - i * 10);
                sphere.castShadow = true;
                sphere.visible = false;
                allTargets.push(sphere);
            }
            for(let i = 0; i < 8; i++) {
                const sphereMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 });
                const sphere = new THREE.Mesh(sphereGeo, sphereMat);
                const randomHeight = playerHeight + (Math.random() * playerHeight);
                sphere.position.set(corridorWidth / 2.2, randomHeight, -5 - i * 5);
                sphere.castShadow = true;
                sphere.visible = false;
                allTargets.push(sphere);
            }
            
            corridorState = {
                allTargets: allTargets,
                batchSize: 5,
                currentBatchIndex: 0,
                activatedInBatch: 0,
                spheresInCurrentBatch: 0
            };

            showNextCorridorBatch();
            
            genericCounterElement.style.display = 'block';
            updateGenericCounter(t(`已激活: 0 / ${corridorState.allTargets.length}`, `Activated: 0 / ${corridorState.allTargets.length}`));
        }
        
        function showNextCorridorBatch() {
            const { allTargets, batchSize, currentBatchIndex } = corridorState;
            const startIndex = currentBatchIndex * batchSize;
            if (startIndex >= allTargets.length) return; 

            const endIndex = Math.min(startIndex + batchSize, allTargets.length);
            corridorState.spheresInCurrentBatch = 0;

            for (let i = startIndex; i < endIndex; i++) {
                const sphere = allTargets[i];
                scene.add(sphere);
                stageObjects.push(sphere);
                corridorTargets.push(sphere);
                sphere.visible = true;
                corridorState.spheresInCurrentBatch++;
            }
            
            corridorState.currentBatchIndex++;
            corridorState.activatedInBatch = 0;
        }

        function handleCorridorAiming() {
            raycaster.setFromCamera(centerScreen, camera);
            const intersects = raycaster.intersectObjects(corridorTargets);
            if (intersects.length > 0) {
                const aimedObject = intersects[0].object;
                if (camera.position.distanceTo(aimedObject.position) > 15) return;

                if (!activatedCorridorTargets.has(aimedObject)) {
                    aimedObject.material.color.setHex(0x00ff00);
                    aimedObject.material.emissive.setHex(0x008800);
                    activatedCorridorTargets.add(aimedObject);
                    corridorState.activatedInBatch++;
                    
                    updateGenericCounter(t(`已激活: ${activatedCorridorTargets.size} / ${corridorState.allTargets.length}`, `Activated: ${activatedCorridorTargets.size} / ${corridorState.allTargets.length}`));
                    updateInstructions();

                    if (corridorState.activatedInBatch >= corridorState.spheresInCurrentBatch) {
                        showNextCorridorBatch();
                    }
                }
            }
        }

        function setupStage7_Move() {
            camera.position.set(0, playerHeight, 18);
            camera.quaternion.set(0, 0, 0, 1);
            euler.set(0, 0, 0, 'YXZ');
            
            stonePathTexture.repeat.set(5, 5);
            stonePathTexture.needsUpdate = true;
            const floorMaterial = new THREE.MeshStandardMaterial({
                map: stonePathTexture,
                roughness: 0.8
            });
            createFloor(40, 40, floorMaterial);

            createWall(0, 2.5, 20, 40, 5, 0.2);
            createWall(0, 2.5, -20, 40, 5, 0.2);
            createWall(20, 2.5, 0, 0.2, 5, 40);
            createWall(-20, 2.5, 0, 0.2, 5, 40);
            createWall(0, 2.5, 10, 30, 5, 0.2);
            createWall(10, 2.5, 0, 20, 5, 0.2);
            createWall(-15, 2.5, 5, 0.2, 5, 10);
            createWall(0, 2.5, -10, 30, 5, 0.2);
            createWall(-5, 2.5, -5, 0.2, 5, 10);
            
            const finishFlag = createFinishFlag(12, 0, -18);
            
            scene.userData.mazeCols = 40;
            scene.userData.mazeRows = 40;
            scene.userData.cellSize = 1;
            scene.userData.endPos = finishFlag.position.clone();
            scene.userData.startPos = camera.position.clone();
            scene.userData.routePath = [
                new THREE.Vector3(0, 0, 18), new THREE.Vector3(0, 0, 12),
                new THREE.Vector3(-15, 0, 12), new THREE.Vector3(-15, 0, -15),
                new THREE.Vector3(12, 0, -15), new THREE.Vector3(12, 0, -18)
            ];
            scene.userData.walls = [
                {x: 0, z: 10, w: 30, d: 0.2}, {x: 10, z: 0, w: 20, d: 0.2},
                {x: -15, z: 5, w: 0.2, d: 10}, {x: 0, z: -10, w: 30, d: 0.2},
                {x: -5, z: -5, w: 0.2, d: 10}
            ];
        }
        function setupStage8_Jump() { camera.position.set(0, playerHeight, 18); camera.quaternion.set(0, 0, 0, 1); euler.set(0, 0, 0, 'YXZ'); const pathWidth = 4; createFloor(pathWidth, 40); createWall(-pathWidth/2, 2.5, 0, 0.2, 5, 40); createWall(pathWidth/2, 2.5, 0, 0.2, 5, 40); createWall(0, 2.5, 20, pathWidth, 5, 0.2); const obstacleHeight = 1.5; const obstacleY = obstacleHeight / 2; createWall(0, obstacleY, 12, pathWidth, obstacleHeight, 2, 0xff8c00); createWall(0, obstacleY, 6, pathWidth, obstacleHeight, 2, 0xff8c00); createWall(0, obstacleY, 0, pathWidth, obstacleHeight, 2, 0xff8c00); createWall(0, obstacleY, -6, pathWidth, obstacleHeight, 2, 0xff8c00); createWall(0, obstacleY, -12, pathWidth, obstacleHeight, 2, 0xff8c00); createFinishFlag(0, 0, -19); }
        function setupStage9_Skills() { camera.position.set(0, playerHeight, 23); camera.quaternion.set(0, 0, 0, 1); euler.set(0, 0, 0, 'YXZ'); const pathWidth = 4; const pathLength = 50; createFloor(pathWidth, pathLength); createWall(-pathWidth/2, 2.5, 0, 0.2, 5, pathLength); createWall(pathWidth/2, 2.5, 0, 0.2, 5, pathLength); createWall(0, 2.5, pathLength/2, pathWidth, 5, 0.2); const jumpHeight = 1.5; const jumpY = jumpHeight / 2; const crouchBarrierHeight = 1.5; const crouchBarrierY = 2.25; createWall(0, jumpY, 20, pathWidth, jumpHeight, 0.5, 0xff8c00); createWall(0, crouchBarrierY, 15, pathWidth, crouchBarrierHeight, 0.5, 0x708090); createWall(0, jumpY, 10, pathWidth, jumpHeight, 0.5, 0xff8c00); createWall(0, jumpY, 5, pathWidth, jumpHeight, 0.5, 0xff8c00); createWall(0, crouchBarrierY, 0, pathWidth, crouchBarrierHeight, 0.5, 0x708090); createWall(0, crouchBarrierY, -5, pathWidth, crouchBarrierHeight, 0.5, 0x708090); createWall(0, jumpY, -10, pathWidth, jumpHeight, 0.5, 0xff8c00); createWall(0, crouchBarrierY, -15, pathWidth, crouchBarrierHeight, 0.5, 0x708090); createFinishFlag(0, 0, -24); }
        
        function setupTimedMazeLevel(mazeLayout) {
            const cellSize = 5;
            const wallHeight = 4;
            const wallY = wallHeight / 2;
            const mazeRows = mazeLayout.length;
            const mazeCols = mazeLayout[0].length;
            const mapWidth = mazeCols * cellSize;
            const mapLength = mazeRows * cellSize;
            let startPos = new THREE.Vector3();
            let endPos = new THREE.Vector3();
            const offsetX = -mapWidth / 2;
            const offsetZ = -mapLength / 2;
            
            stonePathTexture.repeat.set(mapWidth / 4, mapLength / 4);
            stonePathTexture.needsUpdate = true;
            const floorMaterial = new THREE.MeshStandardMaterial({
                map: stonePathTexture,
                roughness: 0.9,
            });
            createFloor(mapWidth, mapLength, floorMaterial);

            let startCoords = { r: -1, c: -1 };
            let endCoords = { r: -1, c: -1 };
            for (let i = 0; i < mazeRows; i++) {
                for (let j = 0; j < mazeCols; j++) {
                    if (mazeLayout[i][j] === 'S') startCoords = { r: i, c: j };
                    if (mazeLayout[i][j] === 'E') endCoords = { r: i, c: j };
                }
            }

            const wallGeo = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);

            for (let i = 0; i < mazeRows; i++) {
                for (let j = 0; j < mazeCols; j++) {
                    const x = j * cellSize + offsetX + cellSize / 2;
                    const z = i * cellSize + offsetZ + cellSize / 2;
                    const cell = mazeLayout[i][j];

                    if (cell === 1) {
                        createWall(x, wallY, z, cellSize, wallHeight, cellSize);
                    } else {
                        const distToStart = Math.sqrt(Math.pow(i - startCoords.r, 2) + Math.pow(j - startCoords.c, 2));
                        const distToEnd = Math.sqrt(Math.pow(i - endCoords.r, 2) + Math.pow(j - endCoords.c, 2));
                        
                        const isWall = (r, c) => (r < 0 || r >= mazeRows || c < 0 || c >= mazeCols || mazeLayout[r][c] === 1);
                        const wallUp = isWall(i - 1, j);
                        const wallDown = isWall(i + 1, j);
                        const wallLeft = isWall(i, j - 1);
                        const wallRight = isWall(i, j + 1);
                        const wallCount = (wallUp ? 1:0) + (wallDown ? 1:0) + (wallLeft ? 1:0) + (wallRight ? 1:0);

                        if ((wallCount === 3 || (wallCount === 2 && !(wallUp && wallDown) && !(wallLeft && wallRight))) && distToStart > 1.5 && distToEnd > 1.5 ) {
                            const lightX = x + (Math.random() - 0.5) * cellSize * 0.2;
                            const lightZ = z + (Math.random() - 0.5) * cellSize * 0.2;
                            createStreetLight(lightX, 0, lightZ);
                        }
                    }

                    switch (cell) {
                        case 'S': startPos.set(x, playerHeight, z); break;
                        case 'E': endPos.set(x, 0, z); createHeartBalloon(x, 0, z); break;
                        case 'J': createWall(x, 0.75, z, cellSize, 1.5, cellSize, 0xff8c00); break;
                        case 'C': createWall(x, 2.25, z, cellSize, 1.5, cellSize, 0x708090); break;
                    }
                }
            }
            camera.position.copy(startPos);
            camera.quaternion.set(0, 0, 0, 1);
            euler.set(0, Math.PI, 0, 'YXZ');
            camera.quaternion.setFromEuler(euler);
            scene.userData.mazeLayout = mazeLayout;
            scene.userData.mazeRows = mazeRows;
            scene.userData.mazeCols = mazeCols;
            scene.userData.cellSize = cellSize;
            scene.userData.endPos = endPos;
        }
        
        function setupChaseMazeLevel(mazeLayout, npcCount) {
            const cellSize = 6;
            const wallHeight = 5;
            const wallY = wallHeight / 2;
            const mazeRows = mazeLayout.length;
            const mazeCols = mazeLayout[0].length;
            const mapWidth = mazeCols * cellSize;
            const mapLength = mazeRows * cellSize;
            let startPos = new THREE.Vector3();
            const offsetX = -mapWidth / 2;
            const offsetZ = -mapLength / 2;
            
            stonePathTexture.repeat.set(mapWidth / 4, mapLength / 4);
            stonePathTexture.needsUpdate = true;
            const floorMaterial = new THREE.MeshStandardMaterial({
                map: stonePathTexture,
                roughness: 0.9
            });
            createFloor(mapWidth, mapLength, floorMaterial);

            let startCoords = { r: -1, c: -1 };
            for (let i = 0; i < mazeRows; i++) {
                for (let j = 0; j < mazeCols; j++) {
                    if (mazeLayout[i][j] === 'S') startCoords = { r: i, c: j };
                }
            }

            const wallGeo = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);

            for (let i = 0; i < mazeRows; i++) {
                for (let j = 0; j < mazeCols; j++) {
                    const x = j * cellSize + offsetX + cellSize / 2;
                    const z = i * cellSize + offsetZ + cellSize / 2;
                    const cell = mazeLayout[i][j];

                    if (cell === 1) {
                        createWall(x, wallY, z, cellSize, wallHeight, cellSize);
                    } else {
                        const distToStart = Math.sqrt(Math.pow(i - startCoords.r, 2) + Math.pow(j - startCoords.c, 2));
                        
                        const isWall = (r, c) => (r < 0 || r >= mazeRows || c < 0 || c >= mazeCols || mazeLayout[r][c] === 1);
                        const wallUp = isWall(i - 1, j);
                        const wallDown = isWall(i + 1, j);
                        const wallLeft = isWall(i, j - 1);
                        const wallRight = isWall(i, j + 1);
                        const wallCount = (wallUp ? 1:0) + (wallDown ? 1:0) + (wallLeft ? 1:0) + (wallRight ? 1:0);

                        if ((wallCount === 3 || (wallCount === 2 && !(wallUp && wallDown) && !(wallLeft && wallRight))) && distToStart > 1.5) {
                            const lightX = x + (Math.random() - 0.5) * cellSize * 0.2;
                            const lightZ = z + (Math.random() - 0.5) * cellSize * 0.2;
                            createStreetLight(lightX, 0, lightZ);
                        }
                    }

                    switch (cell) {
                        case 'S': startPos.set(x, playerHeight, z); break;
                        case 'N': const npc = createCapsule(0.4, 1.8, 0x0099ff); npc.position.set(x, 0.9, z); scene.add(npc); npcs.push(npc); stageObjects.push(npc); break;
                        case 'J': createWall(x, 0.75, z, cellSize, 1.5, cellSize, 0xff8c00); break;
                        case 'C': createWall(x, 2.25, z, cellSize, 1.5, cellSize, 0x708090); break;
                    }
                }
            }
            camera.position.copy(startPos);
            camera.quaternion.set(0, 0, 0, 1);
            euler.set(0, Math.PI, 0, 'YXZ');
            camera.quaternion.setFromEuler(euler);
            scene.userData.mazeLayout = mazeLayout;
            scene.userData.mazeRows = mazeRows;
            scene.userData.mazeCols = mazeCols;
            scene.userData.cellSize = cellSize;
            scene.userData.totalNpcs = npcCount;
            updateNpcCounter();
            npcCounterElement.style.display = 'block';
        }
        
        function setupLandmarkMazeLevel(mazeLayout) {
            const cellSize = 8;
            const wallHeight = 5;
            const wallY = wallHeight / 2;
            const mazeRows = mazeLayout.length;
            const mazeCols = mazeLayout[0].length;
            const mapWidth = mazeCols * cellSize;
            const mapLength = mazeRows * cellSize;
            let startPos = new THREE.Vector3();
            const offsetX = -mapWidth / 2;
            const offsetZ = -mapLength / 2;
            
            stonePathTexture.repeat.set(mapWidth / 4, mapLength / 4);
            stonePathTexture.needsUpdate = true;
            const floorMaterial = new THREE.MeshStandardMaterial({
                map: stonePathTexture,
                roughness: 0.9
            });
            createFloor(mapWidth, mapLength, floorMaterial);

            let startCoords = { r: -1, c: -1 };
            for (let i = 0; i < mazeRows; i++) {
                for (let j = 0; j < mazeCols; j++) {
                    if (mazeLayout[i][j] === 'S') {
                        startCoords = { r: i, c: j };
                        break; 
                    }
                }
                if (startCoords.r !== -1) break;
            }

            const wallGeo = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);

            let landmarkCounter = 1;
            const minDistFromStart = 3.5;

            for (let i = 0; i < mazeRows; i++) {
                for (let j = 0; j < mazeCols; j++) {
                    const x = j * cellSize + offsetX + cellSize / 2;
                    const z = i * cellSize + offsetZ + cellSize / 2;
                    const cell = mazeLayout[i][j];

                    if (cell === 1) {
                        createWall(x, wallY, z, cellSize, wallHeight, cellSize);
                    } else {
                        const distToStart = Math.sqrt(Math.pow(i - startCoords.r, 2) + Math.pow(j - startCoords.c, 2));
                        const isWall = (r, c) => (r < 0 || r >= mazeRows || c < 0 || c >= mazeCols || mazeLayout[r][c] === 1);
                        const wallUp = isWall(i - 1, j);
                        const wallDown = isWall(i + 1, j);
                        const wallLeft = isWall(i, j - 1);
                        const wallRight = isWall(i, j + 1);
                        const wallCount = (wallUp ? 1:0) + (wallDown ? 1:0) + (wallLeft ? 1:0) + (wallRight ? 1:0);

                       if ((wallCount === 3 || (wallCount === 2 && !(wallUp && wallDown) && !(wallLeft && wallRight))) && distToStart > 1.5 && cell !== 'L' && cell !== 'T') {
                            const lightX = x + (Math.random() - 0.5) * cellSize * 0.2;
                            const lightZ = z + (Math.random() - 0.5) * cellSize * 0.2;
                            createStreetLight(lightX, 0, lightZ);
                        }
                    }

                     switch (cell) {
                        case 'S': startPos.set(x, playerHeight, z); break;
                        case 'L': createLandmark(x, z, landmarkCounter++); break;
                        case 'J': createWall(x, 0.75, z, cellSize, 1.5, cellSize, 0xff8c00); break;
                        case 'C': createWall(x, 2.25, z, cellSize, 1.5, cellSize, 0x708090); break;
                        case 'T':
                            const dist = Math.sqrt(Math.pow(i - startCoords.r, 2) + Math.pow(j - startCoords.c, 2));
                            if (dist > minDistFromStart) {
                                createTurret(x, z);
                            }
                            break;
                    }
                }
            }
            
            if (landmarks.length > 0) {
                const lastLandmark = landmarks[landmarks.length - 1];
                createHeartBalloon(lastLandmark.position.x, lastLandmark.position.y, lastLandmark.position.z);
            }

            camera.position.copy(startPos);
            camera.quaternion.set(0, 0, 0, 1);
            euler.set(0, Math.PI, 0, 'YXZ');
            camera.quaternion.setFromEuler(euler);
            scene.userData.mazeLayout = mazeLayout;
            scene.userData.mazeRows = mazeRows;
            scene.userData.mazeCols = mazeCols;
            scene.userData.cellSize = cellSize;
            nextLandmarkIndex = 0;
            landmarkCounterElement.style.display = 'block';
            updateLandmarkCounter();
            
            minimapUsesLeft = 8;
            mapUsesCounterElement.style.display = 'block';
            updateMapUsesCounter();
        }
        
        function setupStage10_Timed0() { const layout = [['S', 0, 1, 0, 0], [1, 0, 1, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 0], [0, 0, 0, 0, 'E']]; setupTimedMazeLevel(layout); }
        function setupStage11_Timed1() { const layout = [['S', 0, 0, 0, 1, 0, 0, 0], [1, 1, 1, 0, 1, 0, 1, 0], [0, 0, 0, 0, 1, 'J', 1, 0], [0, 1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 1, 0], [1, 1, 1, 0, 1, 1, 1, 0], [0, 0, 0, 0, 1, 0, 0, 0], [1, 1, 1, 1, 1, 0, 1, 'E']]; setupTimedMazeLevel(layout); }
        function setupStage12_Timed2() { const layout = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 'S', 0, 1, 0, 0, 'J', 0, 0, 0, 0, 0, 1], [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1], [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 'C', 0, 1], [1, 1, 1, 0, 1, 1, 'C', 1, 0, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1], [1, 'J', 0, 0, 0, 0, 0, 1, 0, 0, 0, 'J', 1], [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1], [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1], [1, 0, 0, 'C', 0, 0, 0, 0, 0, 0, 0, 'E', 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],]; setupTimedMazeLevel(layout); }
        function setupStage13_Timed3() { const layout = [['S', 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 'J', 0], [1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0], [0, 0, 0, 0, 1, 'C', 1, 0, 0, 0, 1, 0, 0], [0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [1, 1, 1, 'J', 1, 1, 0, 1, 1, 1, 1, 0, 1], [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0], [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0], [0, 'C', 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0], [0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 'J', 1, 0], [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0], [1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1], [0, 0, 0, 0, 'C', 0, 0, 0, 0, 0, 0, 0, 'E'],]; setupTimedMazeLevel(layout); }
        function setupStage14_Chase1() { const layout = [[1, 1, 1, 1, 1, 1, 1], [1, 'S', 0, 1, 0, 'N', 1], [1, 0, 0, 0, 0, 0, 1], [1, 'N', 1, 0, 1, 0, 1], [1, 1, 1, 1, 1, 1, 1]]; setupChaseMazeLevel(layout, 2); }
        function setupStage15_Chase2() { const layout = [[1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 'S', 0, 0, 1, 'J', 1, 'N', 1], [1, 1, 0, 1, 1, 0, 1, 0, 1], [1, 0, 0, 'N', 0, 0, 'C', 0, 1], [1, 0, 1, 1, 1, 1, 1, 0, 1], [1, 'N', 0, 0, 0, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1]]; setupChaseMazeLevel(layout, 3); }
        function setupStage16_Chase3() { const layout = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 'S', 0, 0, 0, 'J', 0, 1, 'N', 1], [1, 1, 1, 0, 1, 1, 0, 1, 0, 1], [1, 'N', 0, 0, 0, 1, 'C', 0, 0, 1], [1, 1, 1, 1, 0, 1, 1, 1, 1, 1], [1, 0, 0, 1, 'N', 0, 0, 'N', 0, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]; setupChaseMazeLevel(layout, 4); }
        function setupStage17_Landmark1() { const layout = [[1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 'S', 0, 0, 1, 'C', 0, 'L', 1], [1, 1, 1, 0, 1, 0, 1, 1, 1], [1, 0, 'J', 0, 0, 0, 0, 0, 1], [1, 0, 1, 1, 1, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 1, 0, 1], [1, 1, 'L', 1, 1, 'J', 1, 0, 1], [1, 'C', 0, 0, 0, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1]]; setupLandmarkMazeLevel(layout); }
        function setupStage18_Landmark2() { const layout = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 'S', 0, 0, 0, 1, 'L', 0, 'J', 0, 1], [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1], [1, 0, 0, 'C', 0, 0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1], [1, 0, 1, 0, 0, 0, 0, 1, 1, 'L', 1], [1, 'L', 1, 0, 1, 1, 0, 0, 'C', 0, 1], [1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1], [1, 0, 'J', 0, 1, 0, 1, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]; setupLandmarkMazeLevel(layout); }
        function setupStage19_Landmark3() { const layout = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 'S', 0, 1, 0, 0, 0, 1, 'J', 0, 0, 'L', 1], [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1], [1, 0, 0, 'L', 0, 1, 'C', 0, 0, 1, 0, 0, 1], [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], [1, 0, 1, 1, 1, 1, 'L', 1, 1, 1, 1, 0, 1], [1, 0, 1, 'J', 0, 0, 0, 0, 0, 0, 1, 0, 1], [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 'L', 1], [1, 0, 0, 0, 'C', 0, 0, 0, 0, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]; setupLandmarkMazeLevel(layout); }
        function setupStage17_Landmark1_2() { const layout = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],[1, 'S', 0, 0, 0, 1, 0, 0, 'L', 1],[1, 1, 1, 0, 1, 1, 0, 1, 0, 1],[1, 0, 0, 0, 1, 0, 0, 1, 0, 1],[1, 0, 1, 1, 1, 0, 1, 1, 0, 1],[1, 0, 1, 0, 0, 0, 1, 0, 0, 1],[1, 'L', 1, 0, 1, 0, 1, 0, 1, 1],[1, 0, 0, 0, 1, 0, 0, 0, 0, 1],[1, 0, 1, 'L', 1, 1, 1, 1, 0, 1],[1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]; setupLandmarkMazeLevel(layout); }
        function setupStage18_Landmark2_2() { const layout = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],[1, 'S', 0, 0, 0, 1, 0, 0, 0, 'L', 1],[1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],[1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],[1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],[1, 'L', 0, 0, 1, 'L', 1, 0, 0, 0, 1],[1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],[1, 0, 0, 0, 0, 0, 0, 0, 1, 'L', 1],[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]; setupLandmarkMazeLevel(layout); }
        function setupStage19_Landmark3_2() { const layout = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],[1, 'S', 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],[1, 1, 1, 0, 1, 1, 1, 0, 1, 'L', 1, 0, 1],[1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],[1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 'L', 1],[1, 0, 1, 'L', 1, 0, 0, 0, 0, 0, 1, 0, 1],[1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],[1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],[1, 1, 1, 1, 1, 'L', 1, 0, 1, 1, 1, 0, 1],[1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],[1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 'L', 1],[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]; setupLandmarkMazeLevel(layout); }
        
        function setupStage22_TurretMaze1() { const layout = [[1,1,1,1,1,1,1,1,1,1],[1,'S',0,0,1,'T',0,0,0,1],[1,1,1,0,1,0,1,1,0,1],[1,0,0,0,0,0,1,0,'L',1],[1,0,1,'T',1,1,1,0,1,1],[1,0,0,1,0,0,0,0,0,1],[1,1,0,1,'T',1,0,1,'T',1],[1,0,0,0,0,0,0,0,0,1],[1,'L',0,0,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1]]; setupLandmarkMazeLevel(layout); }
        function setupStage23_TurretMaze2() { const layout = [[1,1,1,1,1,1,1,1,1,1,1],[1,'S',0,0,1,0,0,'T',0,0,1],[1,1,1,0,1,'T',1,1,1,0,1],[1,'L',0,0,0,0,0,0,0,'L',1],[1,1,1,1,0,1,1,1,1,1,1],[1,'T',0,0,0,'T',0,0,0,'T',1],[1,1,1,1,1,1,0,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,1],[1,0,1,1,1,1,1,1,1,'L',1],[1,'T',0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1]]; setupLandmarkMazeLevel(layout); }
        function setupStage24_TurretMaze3() { const layout = [[1,1,1,1,1,1,1,1,1,1,1,1,1],[1,'S',0,0,0,1,'T',0,0,0,1,0,1],[1,1,'T',1,0,1,0,1,1,0,1,0,1],[1,0,0,0,0,1,0,0,'L',0,1,'T',1],[1,0,1,1,1,1,1,0,1,0,1,0,1],[1,0,'L',0,0,0,1,0,'T',0,0,0,1],[1,1,1,1,1,0,1,1,1,1,1,0,1],[1,'T',0,0,0,0,0,0,'L',0,0,0,1],[1,0,1,1,1,1,1,0,1,1,'T',1,1],[1,0,0,0,0,0,0,0,0,0,0,0,1],[1,'L',0,'T',1,0,1,1,1,1,1,0,1],[1,0,0,0,0,0,0,0,0,0,'T',0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1]]; setupLandmarkMazeLevel(layout); }
        function setupStage25_TurretMaze4() { const layout = [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,'S',0,0,1,0,0,1,0,0,1,0,'T',0,1],[1,1,1,0,1,0,1,1,'T',0,1,0,1,0,1],[1,0,0,0,1,0,'L',0,1,0,1,0,0,0,1],[1,0,1,1,1,1,1,0,1,0,1,1,1,0,1],[1,0,'T',0,0,0,0,0,1,0,0,0,1,0,1],[1,1,1,1,0,1,1,1,1,1,0,1,1,'L',1],[1,'L',0,0,0,0,'T',0,0,0,0,0,0,0,1],[1,1,1,0,1,1,1,1,1,1,1,1,0,1,1],[1,'T',0,0,0,1,0,0,0,0,0,0,'T',0,1],[1,0,1,1,1,1,0,1,1,1,1,0,1,0,1],[1,0,'L',0,0,0,0,1,'T',0,0,0,1,0,1],[1,0,1,1,1,1,1,1,0,1,1,1,1,'L',1],[1,'T',0,0,0,0,0,0,0,0,'T',0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]]; setupLandmarkMazeLevel(layout); }
        function setupStage26_TurretMaze5() { const layout = [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,'S',0,'T',0,0,1,0,0,1,0,0,0,0,1],[1,0,1,1,1,0,1,0,1,1,0,1,1,0,1],[1,0,'L',0,0,0,1,0,'T',0,0,0,0,'L',1],[1,1,1,1,1,0,1,1,1,0,0,0,0,0,1],[1,'T',0,0,0,0,0,0,0,0,1,0,0,0,1],[1,0,1,1,1,1,1,1,1,0,1,1,1,1,1],[1,0,'L',0,0,0,1,0,'T',0,0,0,0,'T',1],[1,1,1,1,1,0,1,0,1,1,1,1,0,1,1],[1,'T',0,0,0,0,1,0,'L',0,0,0,0,0,1],[1,0,1,1,1,1,1,1,1,1,1,1,1,0,1],[1,0,'T',0,0,0,0,0,0,0,1,0,0,0,1],[1,0,1,1,1,1,1,1,1,0,1,'T',1,'L',1],[1,0,'L',0,'T',0,0,0,0,0,1,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]]; setupLandmarkMazeLevel(layout); }

        // --- NEW: Survival (Turret Arena) stages ---
        
function setupSurvivalArena(config) {
    // Reset camera safely
    camera.position.set(0, playerHeight, 0);
    if (camera.quaternion) camera.quaternion.set(0, 0, 0, 1);
    if (typeof euler !== 'undefined' && euler && typeof euler.set === 'function') {
        euler.set(0, 0, 0, 'YXZ');
    }
    // Safe background & fog
    scene.background = new THREE.Color(0x2b2b3b);
    scene.fog = new THREE.Fog(0x2b2b3b, 0, 120);

    const size = (config && config.size) ? config.size : 36;
    // Floor material with graceful fallback
    let floorMat = null;
    try {
        if (typeof missionCorridorFloorTexture !== 'undefined' && missionCorridorFloorTexture) {
            missionCorridorFloorTexture.wrapS = missionCorridorFloorTexture.wrapT = THREE.RepeatWrapping;
            missionCorridorFloorTexture.repeat.set(size / 4, size / 4);
            missionCorridorFloorTexture.needsUpdate = true;
            floorMat = new THREE.MeshStandardMaterial({ map: missionCorridorFloorTexture, metalness: 0, roughness: 0.85 });
        }
    } catch (e) {}
    if (!floorMat) {
        floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, metalness: 0, roughness: 0.9 });
    }
    // Create floor (utility or fallback)
    if (typeof createFloor === 'function') {
        createFloor(size, size, floorMat);
    } else {
        const geo = new THREE.PlaneGeometry(size, size);
        const mesh = new THREE.Mesh(geo, floorMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        scene.add(mesh);
        if (typeof stageObjects !== 'undefined' && stageObjects) stageObjects.push(mesh);
    }
    // Extra: explicit invisible floor collider to guarantee ground support
    try {
        const floorColliderGeo = new THREE.BoxGeometry(size, 0.5, size);
        const floorColliderMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
        const floorCollider = new THREE.Mesh(floorColliderGeo, floorColliderMat);
        floorCollider.position.set(0, 0, 0);
        scene.add(floorCollider);
        if (typeof stageObjects !== 'undefined' && stageObjects) stageObjects.push(floorCollider);
        if (typeof collidables !== 'undefined' && collidables) collidables.push(floorCollider);
    } catch (e) {}

    // Boundaries & cover
    const boundary = size / 2 - 1;
    const makeWall = (x,y,z, w,h,d, color) => {
        if (typeof createWall === 'function') {
            createWall(x,y,z, w,h,d, color);
        } else {
            const g = new THREE.BoxGeometry(w, h, d);
            const m = new THREE.MeshStandardMaterial({ color: color || 0x777777 });
            const wall = new THREE.Mesh(g, m);
            wall.position.set(x,y,z);
            wall.castShadow = false; wall.receiveShadow = true;
            scene.add(wall);
            if (typeof stageObjects !== 'undefined' && stageObjects) stageObjects.push(wall);
            if (typeof collidables !== 'undefined' && collidables) collidables.push(wall);
        }
    };
    makeWall(0, 0.5, -boundary, size, 1, 0.5, 0x777777);
    makeWall(0, 0.5,  boundary, size, 1, 0.5, 0x777777);
    makeWall(-boundary, 0.5, 0, 0.5, 1, size, 0x777777);
    makeWall( boundary, 0.5, 0, 0.5, 1, size, 0x777777);
    // Replace big cover with several small covers
const smallCovers = [
    {x:-6, z:-2}, {x:-2, z:-2}, {x:2, z:-2}, {x:6, z:-2},
    {x:-5, z: 2}, {x: 0, z: 2}, {x:5, z: 2}
];
smallCovers.forEach(p => makeWall(p.x, 0.8, p.z, 1.2, 3.0, 0.6, 0x999999));


    
    // Patterned turrets: linear ("left-right") or circular ("around")
    const radius = boundary - 2;
    
    // --- Extra covers for survival stages 28–32 ---
    try {
        if (typeof currentStage !== 'undefined' && currentStage >= 28 && currentStage <= 32) {
            // Small scattered covers (narrow, local blocking)
            (function addSmallCovers(){
                const H = 1.6, Y = H/2, W = 1.2, D = 0.6;
                const positions = [
                    {x:-6, z:-2}, {x:-2, z:-2}, {x: 2, z:-2}, {x: 6, z:-2},
                    {x:-5, z: 2}, {x: 0, z: 2}, {x: 5, z: 2},
                    {x:-3, z: 0}, {x: 3, z: 0}, {x: 0, z:-4}, {x: 0, z: 4}
                ];
                positions.forEach(p => { if (typeof makeWall === 'function') makeWall(p.x, Y, p.z, W, H, D, 0x999999); });
            })();
            // Long strip covers for stages 31 and 32
            if (currentStage >= 31) {
                const H2 = 1.6, Y2 = H2/2, C2 = 0x888888;
                // Oriented along X (wide in X, thin in Z)
                if (typeof makeWall === 'function') {
                    makeWall(0, Y2, -3.5, 10, H2, 0.6, C2);
                    makeWall(0, Y2,  3.5, 10, H2, 0.6, C2);
                }
            }
        }
    } catch (e) { /* no-op */ }
const patterns = (config && Array.isArray(config.patterns)) ? config.patterns.slice(0,3) : ['circular'];
    const createdTurrets = [];
    patterns.forEach((pat, i) => {
        let turret = null;
        const angle0 = (i / patterns.length) * Math.PI * 2;
        const x0 = Math.cos(angle0) * radius;
        const z0 = Math.sin(angle0) * radius;
        try {
            const before = (Array.isArray(turrets) ? turrets.length : 0);
            if (typeof createTurret === 'function') {
                createTurret(x0, z0);
                if (Array.isArray(turrets) && turrets.length > before) {
                    turret = turrets[turrets.length - 1];
                }
            }
        } catch (e) { turret = null; }
        if (!turret || !turret.position) {
            // fallback simple mesh
            const g = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 12);
            const m = new THREE.MeshStandardMaterial({ color: 0xcc3333 });
            turret = new THREE.Mesh(g, m);
            scene.add(turret);
            if (stageObjects) stageObjects.push(turret);
            if (Array.isArray(turrets)) turrets.push(turret);
            if (Array.isArray(collidables)) collidables.push(turret);
        }
        turret.position.set(x0, 0.25, z0);
        turret.userData = turret.userData || {};
        if (pat === 'linear') {
            // Left-right along X around the arena center, oscillating
            turret.userData.moveState = { type: 'linear', centerZ: (z0 >= 0 ? (boundary - 0.6) : (-boundary + 0.6)), halfSpan: radius, phase: angle0, omega: (config.omega || 0.12) };
        } else {
            // Circular around the perimeter
            turret.userData.moveState = { type: 'circular', angle: angle0, radius: radius, omega: (config.omega || 0.12), tighten: (config.tighten || 0.12) };
        }
        createdTurrets.push(turret);
    });

    // Animate turret motion per pattern
    var __survAnim = function(time, dt) {
        createdTurrets.forEach(t => {
            if (!t || !t.parent) return;
            const st = t.userData.moveState || {};
            if (st.type === 'linear') {
    // Move back-and-forth along outer edge (fixed Z near boundary)
    st.phase += st.omega * dt;
    const x = Math.max(-radius, Math.min(radius, Math.cos(st.phase) * st.halfSpan));
    const z = (typeof st.centerZ !== 'undefined') ? st.centerZ : (camera && camera.position && camera.position.z >= 0 ? (boundary - 0.6) : (-boundary + 0.6));
    t.position.set(x, 0.25, z);
} else {
                // Circular with slight tighten toward player bearing
                const playerAngle = Math.atan2(camera.position.z, camera.position.x);
                let diff = playerAngle - st.angle;
                while (diff > Math.PI) diff -= 2*Math.PI;
                while (diff < -Math.PI) diff += 2*Math.PI;
                const omega = st.omega + (st.tighten || 0) * (diff / Math.PI) * st.omega;
                st.angle += omega * dt;
                const x = Math.cos(st.angle) * st.radius;
                const z = Math.sin(st.angle) * st.radius;
                t.position.set(x, 0.25, z);
            }
        });
    };
if (Array.isArray(animatedObjects)) {
    animatedObjects.push({ userData: { animation: __survAnim } });
} else {
    if (!scene.userData._survivalTickers) scene.userData._survivalTickers = [];
    scene.userData._survivalTickers.push(__survAnim);
}

    // Survival target time & timer
    scene.userData.survivalTargetTime = config.targetTime;
    scene.userData.survivalFireDelay = 5;
    // Start the timer for survival stages explicitly
    levelStartTime = clock.getElapsedTime();
    isTimerRunning = true;
    if (typeof timerElement !== 'undefined' && timerElement) {
        timerElement.style.display = 'block';
        timerElement.textContent = "0.00s";
    }
}
function setupStage28_Survival1() { setupSurvivalArena({ size: 36, targetTime: 30, omega: 0.12, tighten: 0.12, patterns: ['linear'] }); }
        function setupStage29_Survival2() { setupSurvivalArena({ size: 36, targetTime: 40, omega: 0.12, tighten: 0.12, patterns: ['circular'] }); }
        function setupStage30_Survival3() { setupSurvivalArena({ size: 36, targetTime: 50, omega: 0.14, tighten: 0.14, patterns: ['linear','linear'] }); }
        function setupStage31_Survival4() { setupSurvivalArena({ size: 36, targetTime: 60, omega: 0.15, tighten: 0.15, patterns: ['circular','circular'] }); }
        function setupStage32_Survival5() { setupSurvivalArena({ size: 36, targetTime: 75, omega: 0.16, tighten: 0.16, patterns: ['linear','circular','circular'] }); }


        function setupStage_Final() {
            camera.position.set(0, playerHeight, 8);
            camera.lookAt(0, playerHeight, 0);
            euler.setFromQuaternion(camera.quaternion, 'YXZ');
            createFloor(30, 30);
            scene.background = new THREE.Color(0x141428);
            scene.fog = new THREE.Fog(0x141428, 20, 100);
            if (fireworksInterval) clearInterval(fireworksInterval);
            fireworksInterval = setInterval(() => {
                const x = (Math.random() - 0.5) * 40;
                const z = (Math.random() - 0.5) * 40 - 10;
                create3DFirework(new THREE.Vector3(x, 0, z));
            }, 1000);
            const totalStarsEarned = Object.values(levelStars).reduce((sum, stars) => sum + stars, 0);
            const maxStars = Object.keys(starTimeThresholds).length * 3;
            let rank, rankColor, encouragementMessage, rankLevel;
            if (totalStarsEarned >= maxStars * (2/3)) {
                rank = t('认知大师', 'Cognitive Master');
                rankLevel = 'master';
                rankColor = '#ffd700';
                encouragementMessage = t('太厉害了！您已精通所有认知挑战，展现了卓越的综合能力！', `Amazing! You've mastered all cognitive challenges, demonstrating outstanding comprehensive abilities!`);
            } else if (totalStarsEarned >= maxStars * (1/3)) {
                rank = t('认知专家', 'Cognitive Expert');
                rankLevel = 'expert';
                rankColor = '#c0c0c0';
                encouragementMessage = t('非常出色！您掌握了绝大部分认知技巧，获得了高级认证！', `Excellent work! You've mastered most cognitive skills and earned an advanced certification!`);
            } else {
                rank = t('认知学徒', 'Cognitive Apprentice');
                rankLevel = 'apprentice';
                rankColor = '#cd7f32';
                encouragementMessage = t('恭喜您完成了所有训练，获得了基础能力认证！每一步都是了不起的进步！', 'Congratulations on completing all the training and receiving a basic certification! Every step is great progress!');
            }
            document.getElementById('results-title').textContent = t('综合能力认证', 'Cognitive Mastery');
            document.getElementById('player-final-title').innerHTML = t(`祝贺您, ${playerProfile.title}!`, `Congratulations, ${playerProfile.en_title || playerProfile.title}!`);
            document.getElementById('encouragement-message').innerHTML = encouragementMessage;
            const podium1 = document.getElementById('podium-1');
            const podium2 = document.getElementById('podium-2');
            const podium3 = document.getElementById('podium-3');
            podium1.innerHTML = `<div class="podium-rank">1</div>`;
            podium2.innerHTML = `<div class="podium-rank">2</div>`;
            podium3.innerHTML = `<div class="podium-rank">3</div>`;
            const playerPodiumHTML = `<div class="podium-rank" style="color:${rankColor};">${rank}</div><div class="podium-stars">${totalStarsEarned} ★</div>`;
            if (rankLevel === 'master') {
                podium1.innerHTML = playerPodiumHTML;
            } else if (rankLevel === 'expert') {
                podium2.innerHTML = playerPodiumHTML;
            } else {
                podium3.innerHTML = playerPodiumHTML;
            }
            resultsOverlay.style.display = 'flex';
            blockerElement.style.display = 'none';
            if (document.pointerLockElement) document.exitPointerLock();
        }
        
        function createToyGun() {
            toyGun = new THREE.Group();
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a90e2, roughness: 0.4, metalness: 0.1 });
            const bodyGeo = new THREE.BoxGeometry(0.25, 0.25, 0.6);
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.set(0, -0.1, -0.25);
            toyGun.add(body);
            const handleGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.4, 16);
            const handle = new THREE.Mesh(handleGeo, bodyMat);
            handle.position.set(0, -0.4, -0.15);
            handle.rotation.x = -0.3;
            toyGun.add(handle);
            const barrelMat = new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.2, metalness: 0.5 });
            const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 16);
            const barrel = new THREE.Mesh(barrelGeo, barrelMat);
            barrel.position.set(0, -0.05, -0.7);
            barrel.rotation.x = Math.PI / 2;
            toyGun.add(barrel);
            const sightMat = new THREE.MeshStandardMaterial({ color: 0x9b9b9b });
            const sightGeo = new THREE.BoxGeometry(0.05, 0.05, 0.15);
            const sight = new THREE.Mesh(sightGeo, sightMat);
            sight.position.set(0, 0.05, -0.4);
            toyGun.add(sight);
            toyGun.position.set(0.5, -0.5, -1.0);
            toyGun.rotation.y = -0.15;
        }

        function handleShooting() {
            shootCooldown = 0.2;
            const bulletGeo = new THREE.SphereGeometry(0.05, 16, 8);
            const bulletMat = new THREE.MeshStandardMaterial({ color: 0xffa500, emissive: 0xffa500, emissiveIntensity: 2 });
            const bullet = new THREE.Mesh(bulletGeo, bulletMat);
            const muzzlePosition = new THREE.Vector3();
            const muzzle = toyGun.children[2];
            muzzle.getWorldPosition(muzzlePosition);
            raycaster.setFromCamera(centerScreen, camera);
            
            const shootableObjects = [...collidables, ...turrets.map(t => t.children).flat()];
            const intersects = raycaster.intersectObjects(shootableObjects, true);

            let targetPosition;
            if (intersects.length > 0) {
                targetPosition = intersects[0].point;
            } else {
                targetPosition = new THREE.Vector3();
                camera.getWorldDirection(targetPosition);
                targetPosition.multiplyScalar(1000).add(camera.position);
            }
            const bulletVelocity = new THREE.Vector3().subVectors(targetPosition, muzzlePosition).normalize();
            bullet.position.copy(muzzlePosition);
            bullet.velocity = bulletVelocity.multiplyScalar(100);
            bullet.life = 5;
            bullet.userData.isPlayerBullet = true;
            bullets.push(bullet);
            scene.add(bullet);
        }

        function updateBullets(deltaTime) {
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                bullet.life -= deltaTime;
                const bulletMoveVector = bullet.velocity.clone().multiplyScalar(deltaTime);
                const bulletRaycaster = new THREE.Raycaster(bullet.position, bullet.velocity.clone().normalize());
                
                let collision = false;

                if (bullet.userData.isPlayerBullet) {
                    const shootableObjects = [...collidables, ...turrets.map(t => t.children).flat()];
                    const intersects = bulletRaycaster.intersectObjects(shootableObjects, true);
                    if (intersects.length > 0 && intersects[0].distance < bulletMoveVector.length()) {
                        const intersect = intersects[0];
                        bullet.position.copy(intersect.point);
                        
                        let hitObject = intersect.object;
                        while(hitObject.parent && !hitObject.userData.isTurret) {
                            hitObject = hitObject.parent;
                        }

                        if (hitObject.userData.isTurret) {
                            hitObject.userData.health--;
                            
                            if (!hitObject.userData.isHit) {
                                hitObject.userData.isHit = true;
                                hitObject.traverse(child => {
                                    if(child.isMesh) child.material.emissive.setHex(0xff0000);
                                });

                                setTimeout(() => {
                                    if (hitObject && hitObject.parent) {
                                        let i = 0;
                                        hitObject.traverse(child => {
                                            if(child.isMesh && i < hitObject.userData.originalEmissives.length) {
                                                if (child === hitObject.userData.originalEmissives[i].obj) {
                                                    child.material.emissive.setHex(hitObject.userData.originalEmissives[i].emissive);
                                                }
                                                i++;
                                            }
                                        });
                                        hitObject.userData.isHit = false;
                                    }
                                }, 500);
                            }

                             if (hitObject.userData.health <= 0) {
                                const turretIndex = turrets.indexOf(hitObject);
                                if (turretIndex > -1) turrets.splice(turretIndex, 1);
                                
                                const collidableIndex = collidables.indexOf(hitObject);
                                if (collidableIndex > -1) collidables.splice(collidableIndex, 1);

                                scene.remove(hitObject);
                                create3DFirework(hitObject.position);

                                if (playerHealth < maxPlayerHealth) {
                                    playerHealth++;
                                    updateHealthBar();
                                }
                                minimapUsesLeft++;
                                updateMapUsesCounter();
                            }
                        } else if (intersect.object.userData.isTargetRing) {
                            createBulletHole(intersect);
                        }
                        collision = true;
                    }
                } 
                else {
                    if (!canTurretsAttackPlayer()) {
                        collision = true;
                    } else {
                    const playerBox = new THREE.Box3().setFromCenterAndSize(camera.position, new THREE.Vector3(playerRadius*2, playerHeight, playerRadius*2));
                    playerBox.min.y = camera.position.y - playerHeight;
                    playerBox.max.y = camera.position.y;
                    if (playerBox.containsPoint(bullet.position)) {
                        playerHealth--;
                        updateHealthBar();
                        if (playerHealth <= 0) {
                            handlePlayerDeath();
                        }
                        collision = true;
                    } else {
                        const intersects = bulletRaycaster.intersectObjects(collidables, true);
                        if (intersects.length > 0 && intersects[0].distance < bulletMoveVector.length()) {
                            collision = true;
                        }
                    }
                    }
                }

                if (collision || bullet.life <= 0) {
                    scene.remove(bullet);
                    bullet.geometry.dispose();
                    bullet.material.dispose();
                    bullets.splice(i, 1);
                    continue;
                }
                bullet.position.add(bulletMoveVector);
            }
        }
        
        function createBulletHole(intersect) {
            const heartShape = new THREE.Shape();
            const s = 0.05;
            heartShape.moveTo(0, -1.5 * s);
            heartShape.bezierCurveTo(-3 * s, 1.5 * s, -1 * s, 3 * s, 0, 2 * s);
            heartShape.bezierCurveTo(1 * s, 3 * s, 3 * s, 1.5 * s, 0, -1.5 * s);
            const holeGeo = new THREE.ShapeGeometry(heartShape);
            const holeMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 1, side: THREE.DoubleSide });
            const holeMesh = new THREE.Mesh(holeGeo, holeMat);
            let targetParent = intersect.object;
            while(targetParent.parent && targetParent.name !== 'warmup_target') targetParent = targetParent.parent;
            const hole = { mesh: holeMesh, life: 3.0 };
            if (targetParent && targetParent.name === 'warmup_target') {
                const localPoint = targetParent.worldToLocal(intersect.point.clone());
                holeMesh.position.copy(localPoint);
                holeMesh.position.addScaledVector(intersect.face.normal, 0.02); 
                holeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), intersect.face.normal);
                holeMesh.rotation.z = Math.PI;
                targetParent.add(holeMesh);
            } else {
                holeMesh.position.copy(intersect.point);
                holeMesh.lookAt(intersect.point.clone().add(intersect.face.normal));
                holeMesh.position.addScaledVector(intersect.face.normal, 0.01);
                scene.add(holeMesh);
            }
            bulletHoles.push(hole);
        }

        function updateBulletHoles(deltaTime) {
            for (let i = bulletHoles.length - 1; i >= 0; i--) {
                const hole = bulletHoles[i];
                hole.life -= deltaTime;
                if (hole.life <= 0) {
                    hole.mesh.parent.remove(hole.mesh);
                    hole.mesh.geometry.dispose();
                    hole.mesh.material.dispose();
                    bulletHoles.splice(i, 1);
                } else if (hole.life <= 1.0) {
                    hole.mesh.material.opacity = hole.life;
                }
            }
        }


        function handleWarmupAiming() { raycaster.setFromCamera(centerScreen, camera); const intersects = raycaster.intersectObjects(stageObjects, true); let currentHit = null; for (const intersect of intersects) { if (intersect.object.userData.isTargetRing) { currentHit = intersect.object; break; } } if (highlightedRing && highlightedRing !== currentHit) { highlightedRing.material.emissive.setHex(0x000000); highlightedRing = null; } if (currentHit && currentHit !== highlightedRing) { highlightedRing = currentHit; highlightedRing.material.emissive.setHex(0x666666); } }
        function handleAiming() { raycaster.setFromCamera(centerScreen, camera); const intersects = raycaster.intersectObjects(stage1Targets); if (intersects.length > 0) { const aimedObject = intersects[0].object; if (aimedObject.userData.isTarget && !aimedTargets.has(aimedObject)) { aimedObject.material.emissive.setHex(0x00ff00); aimedTargets.add(aimedObject); updateInstructions(); } } }
        function updatePlayer(deltaTime) { 
            const moveDirection = new THREE.Vector3(); 
            if (currentStage === 5) {
                if (keys['KeyA']) moveDirection.x = -1; 
                if (keys['KeyD']) moveDirection.x = 1;
            } else {
                if (keys['KeyW']) moveDirection.z = -1; 
                if (keys['KeyS']) moveDirection.z = 1; 
                if (keys['KeyA']) moveDirection.x = -1; 
                if (keys['KeyD']) moveDirection.x = 1;
            }

            if (!hasPlayerMoved && moveDirection.lengthSq() > 0) { hasPlayerMoved = true; if (currentStage >= 16 && currentStage <= 26) { minimapContainer.style.display = 'none'; } } if (!canPlayerMove) return; const wantsToCrouch = (keys['ShiftLeft'] || keys['ShiftRight']); if (wantsToCrouch) { if (!isCrouching && playerOnFloor) { camera.position.y -= (playerHeight - playerCrouchHeight); } isCrouching = true; } else { if (isCrouching) { const upRaycaster = new THREE.Raycaster(camera.position, new THREE.Vector3(0, 1, 0), 0, playerHeight - playerCrouchHeight + 0.1); const ceilingIntersections = upRaycaster.intersectObjects(collidables); if (ceilingIntersections.length === 0) { camera.position.y += (playerHeight - playerCrouchHeight); isCrouching = false; } } } const speed = (isCrouching ? crouchSpeed : moveSpeed); if (moveDirection.lengthSq() > 0) { moveDirection.normalize(); const worldMoveDirection = moveDirection.clone().applyQuaternion(camera.quaternion); camera.position.x += worldMoveDirection.x * speed * deltaTime; camera.position.z += worldMoveDirection.z * speed * deltaTime; } const currentHeight = isCrouching ? playerCrouchHeight : playerHeight; const downRaycaster = new THREE.Raycaster(camera.position, new THREE.Vector3(0, -1, 0), 0, currentHeight + 0.2); const groundIntersections = downRaycaster.intersectObjects([...collidables, ...stageObjects.filter(o => o.geometry && o.geometry.type === 'PlaneGeometry')]); playerOnFloor = groundIntersections.length > 0; if (playerOnFloor) { const groundY = groundIntersections[0].point.y; if (playerVelocity.y <= 0) { playerVelocity.y = 0; camera.position.y = groundY + currentHeight; } } else { playerVelocity.y -= gravity * deltaTime; } if (keys['Space'] && playerOnFloor) { playerVelocity.y = jumpForce; playerOnFloor = false; } camera.position.y += playerVelocity.y * deltaTime; const playerBox = new THREE.Box3().setFromCenterAndSize(camera.position, new THREE.Vector3(playerRadius*2, currentHeight, playerRadius*2)); playerBox.min.y = camera.position.y - currentHeight; playerBox.max.y = camera.position.y; collidables.forEach(collidable => { const collidableBox = new THREE.Box3().setFromObject(collidable); if (playerBox.intersectsBox(collidableBox)) { const center = new THREE.Vector3(); playerBox.getCenter(center); const collidableCenter = new THREE.Vector3(); collidableBox.getCenter(collidableCenter); const overlap = new THREE.Vector3().subVectors(center, collidableCenter); const halfSizePlayer = new THREE.Vector3(); playerBox.getSize(halfSizePlayer).multiplyScalar(0.5); const halfSizeCollidable = new THREE.Vector3(); collidableBox.getSize(halfSizeCollidable).multiplyScalar(0.5); const penetration = new THREE.Vector3((halfSizePlayer.x + halfSizeCollidable.x) - Math.abs(overlap.x), (halfSizePlayer.y + halfSizeCollidable.y) - Math.abs(overlap.y), (halfSizePlayer.z + halfSizeCollidable.z) - Math.abs(overlap.z)); if (penetration.x < penetration.z && penetration.x < penetration.y) { camera.position.x += penetration.x * Math.sign(overlap.x); } else if (penetration.z < penetration.y) { camera.position.z += penetration.z * Math.sign(overlap.z); } else { if (playerVelocity.y > 0 && overlap.y < 0) { playerVelocity.y = 0; } camera.position.y += penetration.y * Math.sign(overlap.y); } } }); }
        function isNPCBlockingCollidable(collidable) {
            if (!collidable || collidable.visible === false) return false;
            let current = collidable;
            while (current) {
                if (current.userData && current.userData.npcPassThrough) return false;
                current = current.parent;
            }
            return true;
        }

        function getNPCBlockingCollidables() {
            return collidables.filter(isNPCBlockingCollidable);
        }

        function canPlaceNPCAt(npc, position) {
            const radius = npc.userData.npcRadius || 0.45;
            const height = npc.userData.npcHeight || 1.8;
            const npcBox = new THREE.Box3().setFromCenterAndSize(
                position,
                new THREE.Vector3(radius * 2.1, height * 0.92, radius * 2.1)
            );
            return !getNPCBlockingCollidables().some(collidable => {
                const collidableBox = new THREE.Box3().setFromObject(collidable);
                return npcBox.intersectsBox(collidableBox);
            });
        }

        function getNPCClearance(position, direction, maxDistance = 5) {
            if (direction.lengthSq() === 0) return 0;
            const ray = new THREE.Raycaster(position, direction.clone().normalize(), 0, maxDistance);
            const hits = ray.intersectObjects(getNPCBlockingCollidables(), true);
            return hits.length ? hits[0].distance : maxDistance;
        }

        function getBestNPCDirection(npc, preferredDirection) {
            const preferred = preferredDirection.clone();
            preferred.y = 0;
            if (preferred.lengthSq() < 0.001) {
                preferred.set(Math.random() - 0.5, 0, Math.random() - 0.5);
            }
            preferred.normalize();

            const currentDistance = new THREE.Vector2(npc.position.x, npc.position.z).distanceTo(new THREE.Vector2(camera.position.x, camera.position.z));
            let bestDirection = preferred.clone();
            let bestScore = -Infinity;
            const sampleCount = 16;

            for (let i = 0; i < sampleCount; i++) {
                const angle = (i / sampleCount) * Math.PI * 2;
                const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                const clearance = getNPCClearance(npc.position, direction, 5);
                const future = npc.position.clone().add(direction.clone().multiplyScalar(Math.min(2.5, clearance)));
                const futureDistance = new THREE.Vector2(future.x, future.z).distanceTo(new THREE.Vector2(camera.position.x, camera.position.z));
                let score = direction.dot(preferred) * 1.25;
                score += Math.min(clearance, 5) * 0.42;
                score += (futureDistance - currentDistance) * 0.72;
                if (clearance < 1.2) score -= 5;
                if (!canPlaceNPCAt(npc, future)) score -= 4;
                if (score > bestScore) {
                    bestScore = score;
                    bestDirection = direction;
                }
            }
            return bestDirection.normalize();
        }

        function tryMoveNPC(npc, moveStep) {
            if (moveStep.lengthSq() === 0) return true;
            const nextPos = npc.position.clone().add(moveStep);
            if (canPlaceNPCAt(npc, nextPos)) {
                npc.position.copy(nextPos);
                return true;
            }

            const steps = Math.abs(moveStep.x) >= Math.abs(moveStep.z)
                ? [new THREE.Vector3(moveStep.x, 0, 0), new THREE.Vector3(0, 0, moveStep.z)]
                : [new THREE.Vector3(0, 0, moveStep.z), new THREE.Vector3(moveStep.x, 0, 0)];

            for (const step of steps) {
                if (step.lengthSq() === 0) continue;
                const slidePos = npc.position.clone().add(step);
                if (canPlaceNPCAt(npc, slidePos)) {
                    npc.position.copy(slidePos);
                    return true;
                }
            }
            return false;
        }

        function findNearestFreeNPCPosition(npc, preferredDirection, maxDistance = 3.4) {
            const origin = npc.position.clone();
            origin.y = 0.9;
            const preferred = preferredDirection.clone();
            preferred.y = 0;
            if (preferred.lengthSq() < 0.001) {
                preferred.set(1, 0, 0);
            }
            preferred.normalize();

            const directions = [
                preferred.clone(),
                preferred.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
                preferred.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2),
                preferred.clone().multiplyScalar(-1)
            ];
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                directions.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
            }

            for (let radius = 0.35; radius <= maxDistance; radius += 0.35) {
                for (const direction of directions) {
                    const candidate = origin.clone().add(direction.clone().multiplyScalar(radius));
                    candidate.y = 0.9;
                    if (canPlaceNPCAt(npc, candidate)) {
                        return candidate;
                    }
                }
            }
            return null;
        }

        function updateNPC(npc, deltaTime) {
            if (!npc.userData.lastPosition) {
                npc.userData.lastPosition = npc.position.clone();
            }

            const fleeDirection = new THREE.Vector3().subVectors(npc.position, camera.position);
            fleeDirection.y = 0;
            const bestDirection = getBestNPCDirection(npc, fleeDirection);
            const npcSpeed = moveSpeed * 0.95;
            const desiredVelocity = bestDirection.clone().multiplyScalar(npcSpeed);
            npc.velocity.lerp(desiredVelocity, 0.18);
            if (npc.velocity.lengthSq() < 0.05) {
                npc.velocity.copy(desiredVelocity);
            }

            const beforeMove = npc.position.clone();
            const moveStep = npc.velocity.clone().multiplyScalar(deltaTime);
            const moved = tryMoveNPC(npc, moveStep);
            if (!moved) {
                const recoveryDirection = getBestNPCDirection(npc, npc.velocity.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
                npc.velocity.copy(recoveryDirection.multiplyScalar(npcSpeed));
                const recovered = tryMoveNPC(npc, npc.velocity.clone().multiplyScalar(deltaTime * 1.8));
                if (!recovered) {
                    const rescuePosition = findNearestFreeNPCPosition(npc, fleeDirection);
                    if (rescuePosition) {
                        npc.position.copy(rescuePosition);
                    }
                }
            }

            const actualMove = new THREE.Vector2(npc.position.x - beforeMove.x, npc.position.z - beforeMove.z).length();
            const expectedMove = Math.max(0.01, moveStep.length());
            npc.userData.stuckTimer = actualMove < expectedMove * 0.22 ? (npc.userData.stuckTimer || 0) + deltaTime : 0;
            if (npc.userData.stuckTimer > 0.35 || !canPlaceNPCAt(npc, npc.position)) {
                const escapeDirection = getBestNPCDirection(npc, new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5));
                const rescuePosition = findNearestFreeNPCPosition(npc, escapeDirection);
                if (rescuePosition) {
                    npc.position.copy(rescuePosition);
                } else {
                    const escapePos = npc.position.clone().add(escapeDirection.clone().multiplyScalar(0.9));
                    if (canPlaceNPCAt(npc, escapePos)) {
                        npc.position.copy(escapePos);
                    }
                }
                npc.velocity.copy(escapeDirection.multiplyScalar(npcSpeed));
                npc.userData.stuckTimer = 0;
            }

            npc.position.y = 0.9;
            if (npc.velocity.lengthSq() > 0.05) {
                npc.rotation.y = Math.atan2(npc.velocity.x, npc.velocity.z);
            }
            npc.userData.lastPosition.copy(npc.position);
        }
        
        function updateKeyDisplay() {
            if (keyW) keyW.classList.toggle('key-active', !!keys['KeyW']);
            if (keyA) keyA.classList.toggle('key-active', !!keys['KeyA']);
            if (keyS) keyS.classList.toggle('key-active', !!keys['KeyS']);
            if (keyD) keyD.classList.toggle('key-active', !!keys['KeyD']);
            if (keySpace) keySpace.classList.toggle('key-active', !!keys['Space']);
            if (keyShift) keyShift.classList.toggle('key-active', !!(keys['ShiftLeft'] || keys['ShiftRight']));
        }

        function updateNpcCounter() { const total = scene.userData.totalNpcs || 0; const remaining = npcs.length; npcCounterElement.innerHTML = `${t('已捕捉', 'Caught')}: ${total - remaining} / ${total}`; }
        function updateLandmarkCounter() { landmarkCounterElement.innerHTML = `${t('已找到', 'Found')}: ${nextLandmarkIndex} / ${landmarks.length}`; }
        function updateGenericCounter(text) { genericCounterElement.innerHTML = text; }
        function updateCustomGoalCounter() {
            if (!isCustomStage(currentStage) || !genericCounterElement) return;
            const custom = scene.userData.customLevel;
            const goals = scene.userData.customGoals || {};
            const state = scene.userData.customGoalState || {};
            if (!custom) return;
            const parts = [];
            if (goals.reach) parts.push(`${t('终点', 'Goal')}: ${state.reached ? t('完成', 'Done') : t('未完成', 'Open')}`);
            if (goals.landmarks) parts.push(`${t('路标', 'Marks')}: ${nextLandmarkIndex} / ${landmarks.length}`);
            if (goals.npc) parts.push(`NPC: ${(scene.userData.totalNpcs || 0) - npcs.length} / ${scene.userData.totalNpcs || 0}`);
            if (goals.annihilation) parts.push(`${t('歼灭', 'Targets')}: ${state.annihilation ? t('完成', 'Done') : turrets.length}`);
            genericCounterElement.innerHTML = parts.join(' | ') || t('自定义目标', 'Custom Goals');
            genericCounterElement.style.display = 'block';
        }
        
        function updateMapUsesCounter() {
            mapUsesCounterElement.innerHTML = `${t('地图剩余次数', 'Map Uses Left')}: ${minimapUsesLeft}`;
        }

        function showNarration(text) {
            narrationBox.innerHTML = text;
            narrationBox.style.display = 'block';
            if (!text.toLowerCase().includes('cancel')) {
                setTimeout(() => {
                    if (narrationBox.innerHTML === text) { 
                        narrationBox.style.display = 'none';
                    }
                }, 4000);
            }
        }

        function create3DFirework(position) {
            const particleCount = 50;
            const colors = [0xffa500, 0xff4500, 0xffff00, 0x00ff00, 0x00ffff];
            for (let i = 0; i < particleCount; i++) {
                const particleMat = new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true });
                const particleGeo = new THREE.SphereGeometry(0.1, 8, 8);
                const particle = new THREE.Mesh(particleGeo, particleMat);
                particle.position.copy(position);
                const velocity = new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 10 + 5, (Math.random() - 0.5) * 10);
                firework3DParticles.push({ mesh: particle, velocity: velocity, life: 1.5, initialLife: 1.5 });
                scene.add(particle);
            }
        }

        function update3DFireworks(deltaTime) {
            for (let i = firework3DParticles.length - 1; i >= 0; i--) {
                const p = firework3DParticles[i];
                p.life -= deltaTime;
                if (p.life <= 0) {
                    scene.remove(p.mesh);
                    p.mesh.geometry.dispose();
                    p.mesh.material.dispose();
                    firework3DParticles.splice(i, 1);
                } else {
                    p.velocity.y -= 9.8 * deltaTime;
                    p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
                    p.mesh.material.opacity = p.life / p.initialLife;
                }
            }
        }

        function createTrailParticle(position) {
            const trailGeo = new THREE.CircleGeometry(0.8, 16);
            const trailMat = new THREE.MeshBasicMaterial({ 
                color: 0xffff00, 
                transparent: true, 
                opacity: 0.6 
            });
            const particle = new THREE.Mesh(trailGeo, trailMat);
            particle.position.copy(position);
            particle.position.y = 0.01; 
            particle.rotation.x = -Math.PI / 2;
            scene.add(particle);
            trailParticles.push({ mesh: particle, life: 3.0, initialLife: 3.0 });
        }

        function updateTrailParticles(deltaTime) {
            for (let i = trailParticles.length - 1; i >= 0; i--) {
                const p = trailParticles[i];
                p.life -= deltaTime;
                if (p.life <= 0) {
                    scene.remove(p.mesh);
                    p.mesh.geometry.dispose();
                    p.mesh.material.dispose();
                    trailParticles.splice(i, 1);
                } else {
                    p.mesh.material.opacity = (p.life / p.initialLife) * 0.6;
                }
            }
        }

        function drawCustomMinimap() {
            const custom = scene.userData.customLevel;
            if (!minimapCtx || !custom || !custom.minimap || !custom.minimap.enabled) return;
            resizeMinimap(custom.minimap.size);
            const rows = custom.rows;
            const cols = custom.cols;
            const cellSize = scene.userData.cellSize || 5;
            const canvasWidth = minimap.width;
            const canvasHeight = minimap.height;
            const mapWorldWidth = cols * cellSize;
            const mapWorldHeight = rows * cellSize;
            const playerCentered = custom.minimap.playerCentered || custom.minimap.rotateWithPlayer;
            const scale = playerCentered
                ? canvasWidth / (cellSize * 8)
                : Math.min(canvasWidth / mapWorldWidth, canvasHeight / mapWorldHeight);
            const worldOffsetX = -mapWorldWidth / 2;
            const worldOffsetZ = -mapWorldHeight / 2;
            const mapOffsetX = (canvasWidth - mapWorldWidth * scale) / 2;
            const mapOffsetY = (canvasHeight - mapWorldHeight * scale) / 2;
            const rotate = custom.minimap.rotateWithPlayer;
            const cos = Math.cos(euler.y);
            const sin = Math.sin(euler.y);
            const worldToMap = (worldPos) => {
                if (playerCentered) {
                    let dx = worldPos.x - camera.position.x;
                    let dz = worldPos.z - camera.position.z;
                    if (rotate) {
                        const rx = dx * cos - dz * sin;
                        const rz = dx * sin + dz * cos;
                        dx = rx;
                        dz = rz;
                    }
                    return { x: canvasWidth / 2 + dx * scale, y: canvasHeight / 2 + dz * scale };
                }
                return {
                    x: mapOffsetX + ((worldPos.x - worldOffsetX) * scale),
                    y: mapOffsetY + ((worldPos.z - worldOffsetZ) * scale)
                };
            };
            const cellCenter = (r, c) => new THREE.Vector3(c * cellSize + worldOffsetX + cellSize / 2, 0, r * cellSize + worldOffsetZ + cellSize / 2);
            const drawCell = (r, c, color) => {
                const center = cellCenter(r, c);
                const half = cellSize / 2;
                const corners = [
                    worldToMap(new THREE.Vector3(center.x - half, 0, center.z - half)),
                    worldToMap(new THREE.Vector3(center.x + half, 0, center.z - half)),
                    worldToMap(new THREE.Vector3(center.x + half, 0, center.z + half)),
                    worldToMap(new THREE.Vector3(center.x - half, 0, center.z + half))
                ];
                minimapCtx.fillStyle = color;
                minimapCtx.beginPath();
                minimapCtx.moveTo(corners[0].x, corners[0].y);
                for (let i = 1; i < corners.length; i++) minimapCtx.lineTo(corners[i].x, corners[i].y);
                minimapCtx.closePath();
                minimapCtx.fill();
            };
            const drawDot = (position, color, radius = 4, label = '') => {
                const point = worldToMap(position);
                minimapCtx.fillStyle = color;
                minimapCtx.beginPath();
                minimapCtx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                minimapCtx.fill();
                if (label) {
                    minimapCtx.fillStyle = '#000';
                    minimapCtx.font = 'bold 10px sans-serif';
                    minimapCtx.textAlign = 'center';
                    minimapCtx.textBaseline = 'middle';
                    minimapCtx.fillText(label, point.x, point.y);
                }
            };

            minimapCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.72)';
            minimapCtx.fillRect(0, 0, canvasWidth, canvasHeight);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    drawCell(r, c, custom.grid[r][c] === 1 ? '#ff00f5' : '#123cff');
                }
            }
            if (scene.userData.endPos) drawDot(scene.userData.endPos, '#ffea00', 5, 'F');
            landmarks.forEach(landmark => drawDot(landmark.position, landmark.userData.isFound ? '#00ff00' : '#ffffff', 4, String(landmark.userData.number)));
            npcs.forEach(npc => drawDot(npc.position, '#00e5ff', 3));
            turrets.forEach(turret => drawDot(turret.position, '#ff4f9f', 4, 'T'));

            const playerMapPos = worldToMap(camera.position);
            const angle = rotate ? 0 : -euler.y;
            minimapCtx.save();
            minimapCtx.translate(playerMapPos.x, playerMapPos.y);
            minimapCtx.rotate(angle);
            minimapCtx.fillStyle = '#76ff03';
            minimapCtx.beginPath();
            minimapCtx.moveTo(0, -7);
            minimapCtx.lineTo(6, 5);
            minimapCtx.lineTo(0, 2);
            minimapCtx.lineTo(-6, 5);
            minimapCtx.closePath();
            minimapCtx.fill();
            minimapCtx.restore();
        }

        function drawMinimap() {
            if (scene.userData.customLevel) {
                drawCustomMinimap();
                return;
            }
            if (!minimapCtx || !scene.userData.mazeCols) return;
            const rows = scene.userData.mazeRows;
            const cols = scene.userData.mazeCols;
            const cellSize = scene.userData.cellSize;
            const canvasWidth = minimap.width;
            const canvasHeight = minimap.height;
            const scale = Math.min(canvasWidth / (cols * cellSize), canvasHeight / (rows * cellSize));
            const mapWidth = cols * cellSize * scale;
            const mapHeight = rows * cellSize * scale;
            const mapOffsetX = (canvasWidth - mapWidth) / 2;
            const mapOffsetY = (canvasHeight - mapHeight) / 2;
            const worldOffsetX = -(cols * cellSize) / 2;
            const worldOffsetZ = -(rows * cellSize) / 2;
            minimapCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            minimapCtx.fillRect(0, 0, canvasWidth, canvasHeight);
            const worldToMap = (worldPos) => ({ x: mapOffsetX + ((worldPos.x - worldOffsetX) * scale), y: mapOffsetY + ((worldPos.z - worldOffsetZ) * scale) });
            if (scene.userData.mazeLayout) {
                const layout = scene.userData.mazeLayout;
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        const cell = layout[i][j];
                        const x = mapOffsetX + j * cellSize * scale;
                        const y = mapOffsetY + i * cellSize * scale;
                        const w = cellSize * scale;
                        const h = cellSize * scale;
                        if (cell === 1) minimapCtx.fillStyle = '#666';
                        else if (cell === 'J') minimapCtx.fillStyle = '#ff8c00';
                        else if (cell === 'C') minimapCtx.fillStyle = '#708090';
                        else if (cell === 'T') minimapCtx.fillStyle = '#ff4500';
                        else minimapCtx.fillStyle = '#333';
                        minimapCtx.fillRect(x, y, w, h);
                    }
                }
            } else if (currentStage === 6 && scene.userData.walls) {
                 minimapCtx.fillStyle = '#666';
                 scene.userData.walls.forEach(wall => {
                    const wallCenterMap = worldToMap(new THREE.Vector3(wall.x, 0, wall.z));
                    const w = wall.w * scale;
                    const h = wall.d * scale;
                    minimapCtx.fillRect(wallCenterMap.x - w/2, wallCenterMap.y - h/2, (w < 2 && w > 0) ? 2.5 : w, (h < 2 && h > 0) ? 2.5 : h);
                 });
            }
            if (currentStage === 6) {
                const route = scene.userData.routePath;
                if(route && route.length > 0) {
                    minimapCtx.strokeStyle = '#ffdd57';
                    minimapCtx.lineWidth = 2;
                    minimapCtx.setLineDash([4, 4]);
                    const startPoint = worldToMap(route[0]);
                    minimapCtx.beginPath();
                    minimapCtx.moveTo(startPoint.x, startPoint.y);
                    for(let i = 1; i < route.length; i++) {
                        const point = worldToMap(route[i]);
                        minimapCtx.lineTo(point.x, point.y);
                    }
                    minimapCtx.stroke();
                    minimapCtx.setLineDash([]);
                }
                if (scene.userData.startPos) {
                    const startMapPos = worldToMap(scene.userData.startPos);
                    minimapCtx.fillStyle = '#00ff00';
                    minimapCtx.beginPath();
                    minimapCtx.arc(startMapPos.x, startMapPos.y, 5, 0, 2 * Math.PI);
                    minimapCtx.fill();
                }
                if (scene.userData.endPos) {
                    const endMapPos = worldToMap(scene.userData.endPos);
                    minimapCtx.fillStyle = '#ff0000';
                    minimapCtx.beginPath();
                    minimapCtx.arc(endMapPos.x, endMapPos.y, 5, 0, 2 * Math.PI);
                    minimapCtx.fill();
                }
            } else if (currentStage >= 9 && currentStage <= 12) {
                const endMapPos = worldToMap(scene.userData.endPos); 
                minimapCtx.fillStyle = '#ff0000'; 
                minimapCtx.beginPath(); 
                minimapCtx.moveTo(endMapPos.x, endMapPos.y - 5); 
                for (let i = 0; i < 5; i++) { 
                    minimapCtx.lineTo(endMapPos.x + Math.cos((18 + i * 72) * Math.PI / 180) * 5, endMapPos.y - Math.sin((18 + i * 72) * Math.PI / 180) * 5); 
                    minimapCtx.lineTo(endMapPos.x + Math.cos((54 + i * 72) * Math.PI / 180) * 2, endMapPos.y - Math.sin((54 + i * 72) * Math.PI / 180) * 2); 
                } 
                minimapCtx.closePath(); 
                minimapCtx.fill(); 
            } else if (currentStage >= 13 && currentStage <= 15) {
                minimapCtx.fillStyle = '#0099ff'; 
                npcs.forEach(npc => { 
                    const npcMapPos = worldToMap(npc.position); 
                    minimapCtx.beginPath(); 
                    minimapCtx.arc(npcMapPos.x, npcMapPos.y, 2.5, 0, 2 * Math.PI); 
                    minimapCtx.fill(); 
                }); 
            } else if (currentStage >= 16 && currentStage <= 26) {
                landmarks.forEach((landmark) => {
                    const landmarkMapPos = worldToMap(landmark.position);
                    minimapCtx.fillStyle = landmark.userData.isFound ? '#00ff00' : '#ffff00';
                    minimapCtx.beginPath();
                    minimapCtx.arc(landmarkMapPos.x, landmarkMapPos.y, 4, 0, 2 * Math.PI);
                    minimapCtx.fill();
                    minimapCtx.fillStyle = '#000';
                    minimapCtx.font = 'bold 10px sans-serif';
                    minimapCtx.textAlign = 'center';
                    minimapCtx.textBaseline = 'middle';
                    minimapCtx.fillText(landmark.userData.number, landmarkMapPos.x, landmarkMapPos.y);
                });
            }
            const playerMapPos = worldToMap(camera.position);
            const angle = -euler.y;
            minimapCtx.save();
            minimapCtx.translate(playerMapPos.x, playerMapPos.y);
            minimapCtx.rotate(angle);
            minimapCtx.fillStyle = '#00ddff';
            minimapCtx.beginPath();
            minimapCtx.moveTo(0, -6);
            minimapCtx.lineTo(5, 4);
            minimapCtx.lineTo(0, 2);
            minimapCtx.lineTo(-5, 4);
            minimapCtx.closePath();
            minimapCtx.fill();
            minimapCtx.restore();
        }

        function createTurret(x, z) {
            const turretGroup = new THREE.Group();
            
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.7, metalness: 0.2 });
            const baseGeo = new THREE.CylinderGeometry(1.2, 1.5, 0.5, 8);
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.castShadow = true;
            turretGroup.add(base);

            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x495057, roughness: 0.6, metalness: 0.3 });
            const bodyGeo = new THREE.CylinderGeometry(0.8, 1, 1.5, 8);
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 1;
            body.castShadow = true;
            turretGroup.add(body);

            const headGroup = new THREE.Group();
            const headMat = new THREE.MeshStandardMaterial({ color: 0x343a40, roughness: 0.5, metalness: 0.5 });
            const headGeo = new THREE.SphereGeometry(0.7, 16, 8);
            const head = new THREE.Mesh(headGeo, headMat);
            head.castShadow = true;
            headGroup.add(head);

            const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xdd0000, emissiveIntensity: 1 });
            const eyeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16);
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.rotation.z = Math.PI / 2;
            eye.position.x = 0.6;
            headGroup.add(eye);
            
            headGroup.position.y = 1.8;
            turretGroup.add(headGroup);

            turretGroup.position.set(x, 0.25, z);
            
            const originalEmissives = [];
            turretGroup.traverse(child => {
                if (child.isMesh) {
                    originalEmissives.push({obj: child, emissive: child.material.emissive.getHex()});
                }
            });

            turretGroup.userData = {
                isTurret: true,
                health: 5,
                shootCooldown: 0,
                head: headGroup,
                eye: eye,
                isHit: false,
                originalEmissives: originalEmissives
            };

            turretGroup.castShadow = true;
            scene.add(turretGroup);
            stageObjects.push(turretGroup);
            turrets.push(turretGroup);
            collidables.push(turretGroup);
        }


function getTurretBaseCooldown() {
    // Original fastest fire interval
    const base = 0.6;
    if (typeof isSurvivalStage === 'function' && isSurvivalStage(currentStage)) {
        switch (currentStage) {
            case 28: return base * 4.0;       // 1/4 original speed (slowest)
            case 29: return base * 3.0;       // 1/3 original speed
            case 30: return base * 2.0;       // 1/2 original speed
            case 31: return base * (4.0/3.0); // 3/4 original speed
            case 32: return base;             // original fastest
        }
    }
    return base;
}

        function canTurretsAttackPlayer() {
            const hasAnnihilationGoal = isCustomStage(currentStage)
                && scene
                && scene.userData
                && scene.userData.customGoals
                && scene.userData.customGoals.annihilation;
            const isActiveTurretStage = (currentStage >= 22 && currentStage <= 26)
                || hasAnnihilationGoal
                || (typeof isSurvivalStage === 'function' && isSurvivalStage(currentStage));
            return isActiveTurretStage
                && document.pointerLockElement === document.body
                && canPlayerMove
                && !editorTextureSettings.active
                && !isPlayerDead
                && !stageCompletionFlag
                && !isTransitioning;
        }


        function updateTurrets(deltaTime) {
            const canAttackPlayer = canTurretsAttackPlayer();
            turrets.forEach(turret => {
                if (!turret || !turret.userData || turret.userData.disabled) return;
                const head = turret.userData.head;
                if (!head || !turret.userData.eye) return;
                const distanceToPlayer = turret.position.distanceTo(camera.position);

                if (!canAttackPlayer) {
                    if (!turret.userData.isHit) turret.userData.eye.material.emissive.setHex(0x550000);
                    return;
                }

                if (distanceToPlayer < 30) {
                    const turretDirection = new THREE.Vector3();
                    head.getWorldDirection(turretDirection);
                    const playerDirection = new THREE.Vector3().subVectors(camera.position, head.getWorldPosition(new THREE.Vector3()));
                    playerDirection.y -= 0.2;
                    playerDirection.normalize();

                    const angle = turretDirection.angleTo(playerDirection);
                    if(angle > 0.05) {
                        const cross = new THREE.Vector3().crossVectors(turretDirection, playerDirection);
                        head.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(cross.normalize(), Math.min(angle, deltaTime * 2)));
                    }
                    
                    const ray = new THREE.Raycaster(head.getWorldPosition(new THREE.Vector3()), playerDirection);
                    const intersects = ray.intersectObjects(collidables, true);
                    
                    let playerVisible = true;
                    if (intersects.length > 0 && intersects[0].distance < distanceToPlayer - 1) {
                        let hitObject = intersects[0].object;
                        let isSelfHit = false;
                        while(hitObject.parent) {
                            if (hitObject === turret) {
                                isSelfHit = true;
                                break;
                            }
                            hitObject = hitObject.parent;
                        }
                        if (!isSelfHit) {
                            playerVisible = false;
                        }
                    }

                    if (playerVisible && !turret.userData.isHit) {
                        turret.userData.eye.material.emissive.setHex(0xff0000);
                        if (turret.userData.shootCooldown <= 0) {
                            // Survival 5s fire delay + per-stage fire rate scaling
let __canFire = true;
if (typeof isSurvivalStage === 'function' && isSurvivalStage(currentStage)) {
  const __delay = (scene && scene.userData && typeof scene.userData.survivalFireDelay === 'number') ? scene.userData.survivalFireDelay : 5;
  const __elapsed = clock.getElapsedTime() - levelStartTime;
  __canFire = (__elapsed >= __delay);
}
if (__canFire) { turret.userData.shootCooldown = getTurretBaseCooldown(); fireTurretBullet(turret); }
}
                    } else if (!playerVisible && !turret.userData.isHit) {
                         turret.userData.eye.material.emissive.setHex(0x550000);
                    }
                }
                if (turret.userData.shootCooldown > 0) {
                    turret.userData.shootCooldown -= deltaTime;
                }
            });
        }
        
        function fireTurretBullet(turret) {
            const bulletGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const bulletMat = new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff4500, emissiveIntensity: 2 });
            const bullet = new THREE.Mesh(bulletGeo, bulletMat);

            const muzzlePosition = new THREE.Vector3();
            turret.userData.eye.getWorldPosition(muzzlePosition);
            
            const bulletVelocity = new THREE.Vector3().subVectors(camera.position, muzzlePosition).normalize();
            
            bullet.position.copy(muzzlePosition);
            bullet.velocity = bulletVelocity.multiplyScalar(30);
            bullet.life = 5;
            bullet.userData.isPlayerBullet = false;
            bullets.push(bullet);
            scene.add(bullet);
        }

        function updateHealthBar() {
            const percentage = (playerHealth / maxPlayerHealth) * 100;
            healthBar.style.width = `${percentage}%`;
            healthText.textContent = `HP: ${playerHealth} / ${maxPlayerHealth}`;
        }
        
        function handlePlayerDeath() {
            if (isPlayerDead) return;
            isPlayerDead = true;
            canPlayerMove = false;
            stopTimer();
            if (document.pointerLockElement) document.exitPointerLock();
            
            updateInstructions();
            blockerElement.addEventListener('click', () => loadStage(currentStage), { once: true });
            blockerElement.style.display = 'flex';
        }
