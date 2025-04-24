// Tower Defense Ecológico - "Guardiões da Floresta"
// Um jogo onde você defende um ecossistema com torres que evoluem organicamente

// Importações
let scene, camera, renderer, controls;
let clock = new THREE.Clock();
let gameBoard;
let towers = [];
let enemies = [];
let paths = [];
let resources = 100;
let ecosystemHealth = 100;
let wave = 0;
let waveInProgress = false;
let selectedTower = null;
let hoveredTile = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Sistema de elementos: Água, Fogo, Terra, Ar, Vida
const ELEMENTOS = {
  AGUA: { cor: 0x0077ff, nome: "Água", efeito: "Reduz velocidade" },
  FOGO: { cor: 0xff3300, nome: "Fogo", efeito: "Dano ampliado" },
  TERRA: { cor: 0x885500, nome: "Terra", efeito: "Armadura reduzida" },
  AR: { cor: 0xccffff, nome: "Ar", efeito: "Alcance ampliado" },
  VIDA: { cor: 0x33cc33, nome: "Vida", efeito: "Cura ecossistema" }
};

// Inicialização
function init() {
  // Cena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  
  // Câmera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 30, 30);
  
  // Renderizador
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  
  // Controles
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 15;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2.2;
  
  // Iluminação
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  scene.add(directionalLight);
  
  // Inicializar tabuleiro
  createGameBoard();
  
  // Adicionar eventos
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  
  // Interface do usuário
  createUI();
  
  // Iniciar loop de animação
  animate();
  
  // Remover tela de carregamento
  document.getElementById('loader').style.display = 'none';
  
  // Adicionar iluminação melhorada
  enhanceSceneLighting();
}

// Criar UI com estilo brutalista e minimalista
function createUI() {
  const uiContainer = document.createElement('div');
  uiContainer.id = 'game-ui';
  
  // Adicionar estilos CSS
  const style = document.createElement('style');
  style.textContent = `
    #game-ui {
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 20px;
      font-family: 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    #stats {
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }

    #stats h3 {
      font-size: 1.5em;
      margin: 0 0 15px 0;
      color: #4CAF50;
    }

    .stat-value {
      font-size: 1.2em;
      color: #4CAF50;
    }

    #tower-buttons {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    button {
      background: #333;
      border: 2px solid #4CAF50;
      color: white;
      padding: 10px;
      cursor: pointer;
      transition: all 0.3s;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
    }

    button:hover {
      background: #4CAF50;
      color: black;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #tower-info {
      border-top: 2px solid #333;
      padding-top: 20px;
    }

    .tower-stat {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }
  `;
  document.head.appendChild(style);
  
  const statsDiv = document.createElement('div');
  statsDiv.id = 'stats';
  statsDiv.innerHTML = `
    <h3>GUARDIÕES DA FLORESTA</h3>
    <div class="tower-stat">
      <span>RECURSOS</span>
      <span id="resources" class="stat-value">100</span>
    </div>
    <div class="tower-stat">
      <span>SAÚDE</span>
      <span id="health" class="stat-value">100</span>
    </div>
    <div class="tower-stat">
      <span>ONDA</span>
      <span id="wave" class="stat-value">0</span>
    </div>
  `;
  
  const towerButtons = document.createElement('div');
  towerButtons.id = 'tower-buttons';
  towerButtons.innerHTML = `
    <h4>TORRES DISPONÍVEIS</h4>
    <button data-elemento="AGUA">ÁGUA [25] - Reduz velocidade</button>
    <button data-elemento="FOGO">FOGO [25] - Dano ampliado</button>
    <button data-elemento="TERRA">TERRA [25] - Reduz armadura</button>
    <button data-elemento="AR">AR [25] - Alcance maior</button>
    <button data-elemento="VIDA">VIDA [35] - Cura ecossistema</button>
  `;
  
  const actionButtons = document.createElement('div');
  actionButtons.id = 'action-buttons';
  actionButtons.innerHTML = `
    <button id="start-wave">INICIAR ONDA</button>
    <button id="upgrade-tower" disabled>APRIMORAR [50]</button>
    <button id="fuse-tower" disabled>FUNDIR [75]</button>
  `;
  
  const towerInfo = document.createElement('div');
  towerInfo.id = 'tower-info';
  towerInfo.innerHTML = `
    <h4>TORRE SELECIONADA</h4>
    <p id="tower-details">Nenhuma torre selecionada</p>
  `;
  
  uiContainer.appendChild(statsDiv);
  uiContainer.appendChild(towerButtons);
  uiContainer.appendChild(actionButtons);
  uiContainer.appendChild(towerInfo);
  
  document.body.appendChild(uiContainer);
  
  // Adicionar event listeners aos botões
  document.querySelectorAll('#tower-buttons button').forEach(button => {
    button.addEventListener('click', () => {
      const elemento = button.getAttribute('data-elemento');
      selectTowerToBuild(elemento);
    });
  });
  
  document.getElementById('start-wave').addEventListener('click', startWave);
  document.getElementById('upgrade-tower').addEventListener('click', upgradeTower);
  document.getElementById('fuse-tower').addEventListener('click', fuseTowers);
}

// Criar tabuleiro do jogo
function createGameBoard() {
  const boardSize = 15;
  const tileSize = 2;
  
  gameBoard = {
    tiles: [],
    size: boardSize,
    tileSize: tileSize
  };
  
  // Geometria e material base
  const tileGeometry = new THREE.BoxGeometry(tileSize, 0.5, tileSize);
  const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x33aa33 });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x0099ff });
  
  // Criar grid
  for (let x = 0; x < boardSize; x++) {
    gameBoard.tiles[x] = [];
    for (let z = 0; z < boardSize; z++) {
      const posX = (x - boardSize / 2) * tileSize;
      const posZ = (z - boardSize / 2) * tileSize;
      
      // Determinar tipo de tile
      let tileType = 'grass';
      let material = grassMaterial;
      
      // Criar rio
      if (z === Math.floor(boardSize / 2) && x !== 0 && x !== boardSize - 1) {
        tileType = 'water';
        material = waterMaterial;
      }
      
      // Criar caminho
      if ((x === Math.floor(boardSize / 3) && z < boardSize - 2) || 
          (z === boardSize - 3 && x >= Math.floor(boardSize / 3) && x < boardSize - 2) ||
          (x === boardSize - 3 && z >= 2 && z <= boardSize - 3) ||
          (z === 2 && x <= boardSize - 3 && x >= 2) ||
          (x === 2 && z >= 2 && z < Math.floor(boardSize / 2))) {
        tileType = 'path';
        material = pathMaterial;
      }
      
      // Criar tile
      const tile = new THREE.Mesh(tileGeometry, material);
      tile.position.set(posX, 0, posZ);
      tile.receiveShadow = true;
      
      // Adicionar à cena
      scene.add(tile);
      
      // Armazenar informações do tile
      gameBoard.tiles[x][z] = {
        mesh: tile,
        type: tileType,
        position: { x: posX, z: posZ },
        gridPosition: { x, z },
        hasTower: false,
        tower: null
      };
      
      // Adicionar tile ao caminho se for do tipo 'path'
      if (tileType === 'path') {
        paths.push({ x: posX, z: posZ });
      }
    }
  }
  
  // Ordenar caminho para determinar pontos de início/fim e direção do caminho
  organizePathPoints();
  
  // Adicionar pontos de início e fim
  createStartAndEndPoints();
}

// Organizar pontos do caminho para criar rota para inimigos
function organizePathPoints() {
  // Identificar ponto de início (extremidade do caminho)
  const startPoint = paths.find(p => {
    const gridX = Math.round(p.x / gameBoard.tileSize + gameBoard.size / 2);
    const gridZ = Math.round(p.z / gameBoard.tileSize + gameBoard.size / 2);
    
    // Verificar se é uma extremidade
    let connections = 0;
    const neighbors = [
      { x: gridX + 1, z: gridZ },
      { x: gridX - 1, z: gridZ },
      { x: gridX, z: gridZ + 1 },
      { x: gridX, z: gridZ - 1 }
    ];
    
    for (const neighbor of neighbors) {
      if (neighbor.x >= 0 && neighbor.x < gameBoard.size && 
          neighbor.z >= 0 && neighbor.z < gameBoard.size &&
          gameBoard.tiles[neighbor.x][neighbor.z].type === 'path') {
        connections++;
      }
    }
    
    return connections === 1;
  });
  
  if (!startPoint) return;
  
  // Reorganizar o caminho
  const organizedPath = [startPoint];
  const visited = new Set();
  visited.add(`${startPoint.x},${startPoint.z}`);
  
  let current = startPoint;
  
  while (organizedPath.length < paths.length) {
    const currentGridX = Math.round(current.x / gameBoard.tileSize + gameBoard.size / 2);
    const currentGridZ = Math.round(current.z / gameBoard.tileSize + gameBoard.size / 2);
    
    const neighbors = [
      { x: currentGridX + 1, z: currentGridZ },
      { x: currentGridX - 1, z: currentGridZ },
      { x: currentGridX, z: currentGridZ + 1 },
      { x: currentGridX, z: currentGridZ - 1 }
    ];
    
    let foundNext = false;
    
    for (const neighbor of neighbors) {
      if (neighbor.x >= 0 && neighbor.x < gameBoard.size && 
          neighbor.z >= 0 && neighbor.z < gameBoard.size) {
        
        const neighborTile = gameBoard.tiles[neighbor.x][neighbor.z];
        const neighborKey = `${neighborTile.position.x},${neighborTile.position.z}`;
        
        if (neighborTile.type === 'path' && !visited.has(neighborKey)) {
          organizedPath.push(neighborTile.position);
          visited.add(neighborKey);
          current = neighborTile.position;
          foundNext = true;
          break;
        }
      }
    }
    
    if (!foundNext) break;
  }
  
  // Substituir o caminho original pelo caminho organizado
  paths = organizedPath;
}

// Criar pontos de início e fim do caminho
function createStartAndEndPoints() {
  // Ponto de início
  const startGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  const startMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const startPoint = new THREE.Mesh(startGeometry, startMaterial);
  startPoint.position.set(paths[0].x, 1, paths[0].z);
  scene.add(startPoint);
  
  // Ponto de fim
  const endGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  const endMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const endPoint = new THREE.Mesh(endGeometry, endMaterial);
  endPoint.position.set(paths[paths.length - 1].x, 1, paths[paths.length - 1].z);
  scene.add(endPoint);
}

// Selecionar torre para construir
function selectTowerToBuild(elemento) {
  if (resources < 25 || (elemento === 'VIDA' && resources < 35)) {
    alert('Recursos insuficientes!');
    return;
  }
  
  selectedTower = {
    type: 'build',
    elemento: elemento
  };
  
  document.getElementById('tower-details').textContent = `Construindo: Torre de ${ELEMENTOS[elemento].nome}`;
}

// Construir torre
function buildTower(tile) {
  if (!selectedTower || selectedTower.type !== 'build') return;
  
  if (tile.hasTower || tile.type !== 'grass') {
    alert('Você só pode construir em terreno vazio!');
    return;
  }
  
  const elemento = selectedTower.elemento;
  const custo = elemento === 'VIDA' ? 35 : 25;
  
  if (resources < custo) {
    alert('Recursos insuficientes!');
    return;
  }
  
  // Reduzir recursos
  resources -= custo;
  document.getElementById('resources').textContent = resources;
  
  // Criar geometria baseada no elemento
  let towerGeometry, towerMaterial;
  
  switch (elemento) {
    case 'AGUA':
      // Torre de água em forma de fonte espiral
      towerGeometry = new THREE.CylinderGeometry(0.4, 0.6, 2.5, 8, 4, true);
      towerMaterial = new THREE.MeshPhongMaterial({ 
        color: ELEMENTOS[elemento].cor,
        transparent: true,
        opacity: 0.8,
        shininess: 100
      });
      break;
      
    case 'FOGO':
      // Torre de fogo em forma de chama
      towerGeometry = new THREE.ConeGeometry(0.6, 2.5, 8, 4);
      towerMaterial = new THREE.MeshStandardMaterial({ 
        color: ELEMENTOS[elemento].cor,
        emissive: 0xff4400,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7
      });
      break;
      
    case 'TERRA':
      // Torre de terra em forma de cristal hexagonal
      towerGeometry = new THREE.DodecahedronGeometry(0.8, 0);
      towerMaterial = new THREE.MeshStandardMaterial({ 
        color: ELEMENTOS[elemento].cor,
        roughness: 0.8,
        metalness: 0.2
      });
      break;
      
    case 'AR':
      // Torre de ar em forma de tornado
      towerGeometry = new THREE.TorusGeometry(0.4, 0.2, 8, 16);
      towerMaterial = new THREE.MeshPhongMaterial({ 
        color: ELEMENTOS[elemento].cor,
        transparent: true,
        opacity: 0.6,
        shininess: 90
      });
      break;
      
    case 'VIDA':
      // Torre de vida em forma de árvore sagrada
      towerGeometry = new THREE.SphereGeometry(0.8, 8, 8);
      towerMaterial = new THREE.MeshStandardMaterial({ 
        color: ELEMENTOS[elemento].cor,
        emissive: 0x33ff33,
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.6
      });
      break;
  }
  
  const towerMesh = new THREE.Mesh(towerGeometry, towerMaterial);
  towerMesh.position.set(tile.position.x, 1.5, tile.position.z);
  towerMesh.castShadow = true;
  
  // Adicionar efeitos de luz específicos para cada torre
  const pointLight = new THREE.PointLight(ELEMENTOS[elemento].cor, 1, 5);
  pointLight.position.set(0, 2, 0);
  towerMesh.add(pointLight);
  
  scene.add(towerMesh);
  
  // Criar área de alcance
  const range = 5;
  const rangeGeometry = new THREE.RingGeometry(0.5, range, 32);
  const rangeMaterial = new THREE.MeshBasicMaterial({ 
    color: ELEMENTOS[elemento].cor,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  const rangeMesh = new THREE.Mesh(rangeGeometry, rangeMaterial);
  rangeMesh.rotation.x = -Math.PI / 2;
  rangeMesh.position.set(tile.position.x, 0.1, tile.position.z);
  scene.add(rangeMesh);
  
  // Criar objeto torre
  const tower = {
    mesh: towerMesh,
    rangeMesh: rangeMesh,
    elemento: elemento,
    level: 1,
    range: range,
    damage: elemento === 'FOGO' ? 3 : 2,
    attackSpeed: 1,
    lastAttack: 0,
    position: { x: tile.position.x, z: tile.position.z },
    effects: [ELEMENTOS[elemento].efeito],
    evolution: null
  };
  
  // Aplicar modificadores baseados no elemento
  switch (elemento) {
    case 'AGUA':
      tower.slowFactor = 0.5;
      break;
    case 'FOGO':
      tower.damage = 3;
      break;
    case 'TERRA':
      tower.armorReduction = 0.3;
      break;
    case 'AR':
      tower.range = 7;
      rangeMesh.geometry = new THREE.RingGeometry(0.5, 7, 32);
      break;
    case 'VIDA':
      tower.healFactor = 0.5;
      break;
  }
  
  // Atualizar tile
  tile.hasTower = true;
  tile.tower = tower;
  
  // Adicionar à lista de torres
  towers.push(tower);
  
  // Limpar seleção
  selectedTower = null;
  document.getElementById('tower-details').textContent = 'Nenhuma torre selecionada';
}

// Selecionar torre
function selectTower(tile) {
  if (!tile.hasTower) return;
  
  selectedTower = {
    type: 'select',
    tile: tile,
    tower: tile.tower
  };
  
  // Atualizar UI
  const tower = tile.tower;
  document.getElementById('tower-details').innerHTML = `
    <p>Torre de ${ELEMENTOS[tower.elemento]?.nome || tower.elemento} (Nível ${tower.level})</p>
    <p>Dano: ${tower.damage.toFixed(1)}</p>
    <p>Alcance: ${tower.range}</p>
    <p>Velocidade: ${tower.attackSpeed.toFixed(1)}</p>
    <p>Efeito: ${tower.effects.join(', ')}</p>
    ${tower.evolution ? `<p>Evolução: ${tower.evolution}</p>` : ''}
  `;
  
  // Habilitar botões
  document.getElementById('upgrade-tower').disabled = false;
  document.getElementById('fuse-tower').disabled = hoveredTile === null || !hoveredTile.hasTower;
}

// Aprimorar torre
function upgradeTower() {
  if (!selectedTower || selectedTower.type !== 'select') return;
  
  if (resources < 50) {
    alert('Recursos insuficientes para aprimoramento!');
    return;
  }
  
  const tower = selectedTower.tower;
  
  // Verificar nível máximo
  if (tower.level >= 3) {
    alert('Esta torre já está no nível máximo!');
    return;
  }
  
  // Reduzir recursos
  resources -= 50;
  document.getElementById('resources').textContent = resources;
  
  // Aumentar nível
  tower.level++;
  
  // Melhorar estatísticas
  tower.damage *= 1.5;
  tower.attackSpeed *= 1.2;
  tower.range += 1;
  
  // Atualizar visual
  tower.mesh.scale.set(1 + (tower.level - 1) * 0.2, 1 + (tower.level - 1) * 0.2, 1 + (tower.level - 1) * 0.2);
  
  // Atualizar área de alcance
  scene.remove(tower.rangeMesh);
  const rangeGeometry = new THREE.RingGeometry(0.5, tower.range, 32);
  const rangeMaterial = new THREE.MeshBasicMaterial({ 
    color: ELEMENTOS[tower.elemento]?.cor || 0xffffff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  tower.rangeMesh = new THREE.Mesh(rangeGeometry, rangeMaterial);
  tower.rangeMesh.rotation.x = -Math.PI / 2;
  tower.rangeMesh.position.set(tower.position.x, 0.1, tower.position.z);
  scene.add(tower.rangeMesh);
  
  // Atualizar UI
  document.getElementById('tower-details').innerHTML = `
    <p>Torre de ${ELEMENTOS[tower.elemento]?.nome || tower.elemento} (Nível ${tower.level})</p>
    <p>Dano: ${tower.damage.toFixed(1)}</p>
    <p>Alcance: ${tower.range}</p>
    <p>Velocidade: ${tower.attackSpeed.toFixed(1)}</p>
    <p>Efeito: ${tower.effects.join(', ')}</p>
    ${tower.evolution ? `<p>Evolução: ${tower.evolution}</p>` : ''}
  `;
}

// Funções de interação do mouse
function onMouseMove(event) {
  // Calcular posição do mouse normalizada
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Raycasting para detectar tiles sob o mouse
  raycaster.setFromCamera(mouse, camera);
  
  // Verificar interseções apenas com tiles do tabuleiro
  const tiles = [];
  for (let x = 0; x < gameBoard.size; x++) {
    for (let z = 0; z < gameBoard.size; z++) {
      tiles.push(gameBoard.tiles[x][z].mesh);
    }
  }
  
  const intersects = raycaster.intersectObjects(tiles);
  
  // Resetar hover anterior
  if (hoveredTile && hoveredTile.mesh.material.emissive) {
    hoveredTile.mesh.material.emissive.setHex(0x000000);
  }
  
  // Atualizar tile sob o mouse
  if (intersects.length > 0) {
    const intersectedMesh = intersects[0].object;
    
    // Encontrar o tile correspondente ao mesh
    for (let x = 0; x < gameBoard.size; x++) {
      for (let z = 0; z < gameBoard.size; z++) {
        if (gameBoard.tiles[x][z].mesh === intersectedMesh) {
          hoveredTile = gameBoard.tiles[x][z];
          
          // Destacar tile
          hoveredTile.mesh.material.emissive.setHex(0x333333);
          
          // Se tiver uma torre selecionada para fusão, atualizar botão
          if (selectedTower && selectedTower.type === 'select') {
            document.getElementById('fuse-tower').disabled = !hoveredTile.hasTower || hoveredTile === selectedTower.tile;
          }
          
          break;
        }
      }
    }
  } else {
    hoveredTile = null;
    if (selectedTower && selectedTower.type === 'select') {
      document.getElementById('fuse-tower').disabled = true;
    }
  }
}

function onMouseDown(event) {
  if (!hoveredTile) return;
  
  // Se tiver uma torre selecionada para construção
  if (selectedTower && selectedTower.type === 'build') {
    buildTower(hoveredTile);
  } else {
    // Selecionar torre existente
    if (hoveredTile.hasTower) {
      selectTower(hoveredTile);
    }
  }
}

// Ajustar tamanho ao redimensionar janela
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Fusão de torres (mecânica única)
function fuseTowers() {
  if (!selectedTower || selectedTower.type !== 'select' || !hoveredTile || !hoveredTile.hasTower) return;
  
  if (resources < 75) {
    alert('Recursos insuficientes para fusão!');
    return;
  }
  
  const tower1 = selectedTower.tower;
  const tower2 = hoveredTile.tower;
  
  // Verificar se são torres diferentes
  if (tower1 === tower2) {
    alert('Você não pode fundir uma torre com ela mesma!');
    return;
  }
  
  // Reduzir recursos
  resources -= 75;
  document.getElementById('resources').textContent = resources;
  
  // Determinar nova evolução baseada na combinação
  const combinacao = `${tower1.elemento}_${tower2.elemento}`;
  let evolucao, novoElemento, novaCor;
  
  switch (combinacao) {
    case 'AGUA_FOGO':
    case 'FOGO_AGUA':
      evolucao = 'Torre de Vapor';
      novoElemento = 'Vapor';
      novaCor = 0xccccff;
      break;
    case 'TERRA_AGUA':
    case 'AGUA_TERRA':
      evolucao = 'Torre de Lama';
      novoElemento = 'Lama';
      novaCor = 0x886633;
      break;
    case 'FOGO_TERRA':
    case 'TERRA_FOGO':
      evolucao = 'Torre de Lava';
      novoElemento = 'Lava';
      novaCor = 0xff6600;
      break;
    case 'AR_AGUA':
    case 'AGUA_AR':
      evolucao = 'Torre de Gelo';
      novoElemento = 'Gelo';
      novaCor = 0xaaddff;
      break;
    case 'AR_FOGO':
    case 'FOGO_AR':
      evolucao = 'Torre de Plasma';
      novoElemento = 'Plasma';
      novaCor = 0xff00ff;
      break;
    case 'TERRA_AR':
    case 'AR_TERRA':
      evolucao = 'Torre de Areia';
      novoElemento = 'Areia';
      novaCor = 0xddcc88;
      break;
    default:
      if (tower1.elemento === 'VIDA' || tower2.elemento === 'VIDA') {
        const outroElemento = tower1.elemento === 'VIDA' ? tower2.elemento : tower1.elemento;
        evolucao = `Torre de ${ELEMENTOS[outroElemento]?.nome || outroElemento} Ancestral`;
        novoElemento = `${ELEMENTOS[outroElemento]?.nome || outroElemento} Ancestral`;
        novaCor = 0x66ff66;
      } else {
        evolucao = 'Torre Híbrida';
        novoElemento = 'Híbrido';
        novaCor = 0xffffff;
      }
  }
  
  // Remover torres originais
  scene.remove(tower1.mesh);
  scene.remove(tower1.rangeMesh);
  scene.remove(tower2.mesh);
  scene.remove(tower2.rangeMesh);
  
  // Remover das listas
  const index1 = towers.indexOf(tower1);
  const index2 = towers.indexOf(tower2);
  if (index1 !== -1) towers.splice(index1, 1);
  if (index2 !== -1) towers.splice(index2, 1);
  
  // Atualizar tiles
  selectedTower.tile.hasTower = false;
  selectedTower.tile.tower = null;
  hoveredTile.hasTower = false;
  hoveredTile.tower = null;
  
  // Criar nova torre no tile selecionado
  const newTowerGeometry = new THREE.CylinderGeometry(0.8, 1, 3, 12);
  const newTowerMaterial = new THREE.MeshStandardMaterial({ color: novaCor });
  const newTowerMesh = new THREE.Mesh(newTowerGeometry, newTowerMaterial);
  newTowerMesh.position.set(selectedTower.tile.position.x, 2, selectedTower.tile.position.z);
  newTowerMesh.castShadow = true;
  scene.add(newTowerMesh);
  
  // Criar novo alcance
  const newRange = Math.max(tower1.range, tower2.range) + 2;
  const rangeGeometry = new THREE.RingGeometry(0.5, newRange, 32);
  const rangeMaterial = new THREE.MeshBasicMaterial({ 
    color: novaCor,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  const rangeMesh = new THREE.Mesh(rangeGeometry, rangeMaterial);
  rangeMesh.rotation.x = -Math.PI / 2;
  rangeMesh.position.set(selectedTower.tile.position.x, 0.1, selectedTower.tile.position.z);
  scene.add(rangeMesh);
  
  // Criar nova torre
  const newTower = {
    mesh: newTowerMesh,
    rangeMesh: rangeMesh,
    elemento: novoElemento,
    level: Math.max(tower1.level, tower2.level) + 1,
    range: newRange,
    damage: (tower1.damage + tower2.damage) * 1.5,
    attackSpeed: (tower1.attackSpeed + tower2.attackSpeed) * 0.6,
    lastAttack: 0,
    position: { x: selectedTower.tile.position.x, z: selectedTower.tile.position.z },
    effects: [...new Set([...tower1.effects, ...tower2.effects])],
    evolution: evolucao
  };
  
  // Adicionar efeitos especiais baseados na evolução
  switch (evolucao) {
    case 'Torre de Vapor':
      newTower.effects.push('Dano em área');
      newTower.areaEffect = true;
      break;
    case 'Torre de Lama':
      newTower.effects.push('Redução de velocidade severa');
      newTower.slowFactor = 0.3;
      break;
    case 'Torre de Lava':
      newTower.effects.push('Dano contínuo');
      newTower.dotDamage = true;
      break;
    case 'Torre de Gelo':
      newTower.effects.push('Congelamento temporário');
      newTower.freezeChance = 0.3;
      break;
    case 'Torre de Plasma':
      newTower.effects.push('Dano crítico');
      newTower.critChance = 0.25;
      newTower.critMultiplier = 2.5;
      break;
    case 'Torre de Areia':
      newTower.effects.push('Cegueira de inimigos');
      newTower.confuseChance = 0.4;
      break;
    default:
      if (evolucao.includes('Ancestral')) {
        newTower.effects.push('Fortalecimento de torres próximas');
        newTower.auraRange = 5;
        newTower.auraBuff = 0.3;
      }
  }
  
  // Atualizar tile
  selectedTower.tile.hasTower = true;
  selectedTower.tile.tower = newTower;
  
  // Adicionar à lista de torres
  towers.push(newTower);
  
  // Atualizar seleção
  selectedTower = {
    type: 'select',
    tile: selectedTower.tile,
    tower: newTower
  };
  
  // Atualizar UI
  document.getElementById('tower-details').innerHTML = `
    <p>${evolucao} (Nível ${newTower.level})</p>
    <p>Dano: ${newTower.damage.toFixed(1)}</p>
    <p>Alcance: ${newTower.range}</p>
    <p>Velocidade: ${newTower.attackSpeed.toFixed(1)}</p>
    <p>Efeitos: ${newTower.effects.join(', ')}</p>
  `;
}

// Iniciar onda de inimigos
function startWave() {
  if (waveInProgress) return;
  
  wave++;
  document.getElementById('wave').textContent = wave;
  waveInProgress = true;
  
  // Número de inimigos baseado na onda
  const enemyCount = wave * 5;
  
  // Spawn de inimigos em intervalos
  let spawned = 0;
  
  function spawnEnemy() {
    if (spawned >= enemyCount) {
      waveInProgress = spawned > 0 && enemies.length > 0;
      return;
    }
    
    // Criar inimigo
    const enemyType = determineEnemyType();
    createEnemy(enemyType);
    
    spawned++;
    
    // Continuar spawn
    setTimeout(spawnEnemy, 1000);
  }
  
  spawnEnemy();
  
  // Recompensa por onda
  const reward = 25 + wave * 5;
  resources += reward;
  document.getElementById('resources').textContent = resources;
}

// Determinar tipo de inimigo baseado na onda atual
function determineEnemyType() {
  // Tipos básicos de inimigo
  const enemyTypes = [
    { type: 'poluidor', health: 10, speed: 0.1 * wave, armor: 0, damage: 1, reward: 5 },
    { type: 'cortador', health: 15, speed: 0.08 * wave, armor: 1, damage: 2, reward: 8 },
    { type: 'queimador', health: 20, speed: 0.12 * wave, armor: 0, damage: 3, reward: 10 },
    { type: 'tóxico', health: 25, speed: 0.06 * wave , armor: 2, damage: 2, reward: 12 },
    { type: 'industrial', health: 40, speed: 0.05 * wave, armor: 3, damage: 4, reward: 20 }
  ];
  
  // Tipos especiais de inimigos que aparecem em ondas maiores
  const specialEnemyTypes = [
    { type: 'aterro', health: 80, speed: 0.04, armor: 5, damage: 5, reward: 30, spawnMinions: true },
    { type: 'petroleiro', health: 60, speed: 0.07, armor: 2, damage: 8, reward: 35, areaEffect: true },
    { type: 'desmatador', health: 100, speed: 0.08, armor: 3, damage: 10, reward: 40, healFactor: 0.02 }
  ];
  
  // Chance de inimigo especial baseada na onda
  const specialChance = Math.min(0.5, wave * 0.05);
  
  // Determinar se será um inimigo especial
  if (wave >= 5 && Math.random() < specialChance) {
    // Selecionar um inimigo especial aleatório
    const enemyType = {...specialEnemyTypes[Math.floor(Math.random() * specialEnemyTypes.length)]};
    
    // Escalar com a onda
    const scaleFactor = 1 + (wave - 5) * 0.1;
    enemyType.health = Math.floor(enemyType.health * scaleFactor);
    enemyType.damage = Math.floor(enemyType.damage * scaleFactor);
    enemyType.reward = Math.floor(enemyType.reward * Math.sqrt(scaleFactor));
    
    return enemyType;
  } else {
    // Selecionar um inimigo básico, favorecendo tipos mais fortes em ondas maiores
    let enemyPool = enemyTypes.slice(0, Math.min(enemyTypes.length, Math.ceil(wave / 2)));
    const enemyType = {...enemyPool[Math.floor(Math.random() * enemyPool.length)]};
    
    // Escalar com a onda
    const scaleFactor = 1 + wave * 0.1;
    enemyType.health = Math.floor(enemyType.health * scaleFactor);
    enemyType.damage = Math.floor(enemyType.damage * scaleFactor);
    enemyType.reward = Math.floor(enemyType.reward * Math.sqrt(scaleFactor));
    
    return enemyType;
  }
}

// Criar inimigo
function createEnemy(enemyType) {
  // Geometria e material baseados no tipo
  let geometry, material;
  
  switch (enemyType.type) {
    case 'poluidor':
      geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      material = new THREE.MeshStandardMaterial({ color: 0x666666 });
      break;
    case 'cortador':
      geometry = new THREE.ConeGeometry(0.6, 1.2, 4);
      material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      break;
    case 'queimador':
      geometry = new THREE.SphereGeometry(0.6, 12, 12);
      material = new THREE.MeshStandardMaterial({ color: 0xcc3300 });
      break;
    case 'tóxico':
      geometry = new THREE.IcosahedronGeometry(0.7);
      material = new THREE.MeshStandardMaterial({ color: 0x66cc00 });
      break;
    case 'industrial':
      geometry = new THREE.BoxGeometry(1, 1, 1);
      material = new THREE.MeshStandardMaterial({ color: 0x333333 });
      break;
    case 'aterro':
      geometry = new THREE.DodecahedronGeometry(1.2);
      material = new THREE.MeshStandardMaterial({ color: 0x996633 });
      break;
    case 'petroleiro':
      geometry = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 12);
      material = new THREE.MeshStandardMaterial({ color: 0x000000 });
      break;
    case 'desmatador':
      geometry = new THREE.BoxGeometry(1.3, 1.3, 1.3);
      material = new THREE.MeshStandardMaterial({ color: 0xff6600 });
      break;
    default:
      geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      material = new THREE.MeshStandardMaterial({ color: 0x666666 });
  }
  
  // Criar mesh
  const enemyMesh = new THREE.Mesh(geometry, material);
  enemyMesh.position.set(paths[0].x, 1, paths[0].z);
  enemyMesh.castShadow = true;
  scene.add(enemyMesh);
  
  // Criar barra de vida
  const healthBarBack = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.2, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  healthBarBack.position.y = 1.5;
  enemyMesh.add(healthBarBack);
  
  const healthBarFront = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.2, 0.11),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  healthBarFront.position.y = 1.5;
  healthBarFront.scale.x = 1;
  enemyMesh.add(healthBarFront);
  
  // Objeto inimigo
  const enemy = {
    mesh: enemyMesh,
    healthBar: healthBarFront,
    ...enemyType,
    currentHealth: enemyType.health,
    maxHealth: enemyType.health,
    pathIndex: 0,
    confused: false,
    frozen: false,
    dotEffects: [],
    position: { x: paths[0].x, z: paths[0].z },
    dead: false
  };
  
  // Adicionar à lista de inimigos
  enemies.push(enemy);
  
  return enemy;
}

// Atualizar inimigos
function updateEnemies(deltaTime) {
  // Para cada inimigo
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    
    // Ignorar inimigos mortos
    if (enemy.dead) continue;
    
    // Atualizar efeitos dot (dano contínuo)
    if (enemy.dotEffects.length > 0) {
      for (let j = enemy.dotEffects.length - 1; j >= 0; j--) {
        const dot = enemy.dotEffects[j];
        dot.duration -= deltaTime;
        
        // Aplicar dano por segundo
        enemy.currentHealth -= dot.damagePerSecond * deltaTime;
        
        // Remover efeito expirado
        if (dot.duration <= 0) {
          enemy.dotEffects.splice(j, 1);
        }
      }
    }
    
    // Verificar se inimigo está congelado
    if (enemy.frozen) {
      enemy.frozenTimer -= deltaTime;
      if (enemy.frozenTimer <= 0) {
        enemy.frozen = false;
      } else {
        continue; // Pular movimentação se congelado
      }
    }
    
    // Movimento pelo caminho
    if (enemy.pathIndex < paths.length - 1) {
      // Calcular direção e movimento
      const targetPos = paths[enemy.pathIndex + 1];
      const directionX = targetPos.x - enemy.position.x;
      const directionZ = targetPos.z - enemy.position.z;
      const length = Math.sqrt(directionX * directionX + directionZ * directionZ);
      
      // Verificar se chegou ao ponto do caminho
      if (length < 0.1) {
        enemy.pathIndex++;
      } else {
        // Calcular movimento
        let moveSpeed = enemy.speed;
        
        // Aplicar efeitos de confusão (movimento aleatório)
        if (enemy.confused) {
          enemy.confusedTimer -= deltaTime;
          if (enemy.confusedTimer <= 0) {
            enemy.confused = false;
          } else {
            // Movimento aleatório quando confuso
            const randomAngle = Math.sin(Date.now() * 0.01) * Math.PI * 0.25;
            const newDirX = directionX * Math.cos(randomAngle) - directionZ * Math.sin(randomAngle);
            const newDirZ = directionX * Math.sin(randomAngle) + directionZ * Math.cos(randomAngle);
            enemy.position.x += (newDirX / length) * moveSpeed * deltaTime;
            enemy.position.z += (newDirZ / length) * moveSpeed * deltaTime;
            
            // Atualizar posição do mesh
            enemy.mesh.position.set(enemy.position.x, 1, enemy.position.z);
            
            continue;
          }
        }
        
        // Movimento normal
        enemy.position.x += (directionX / length) * moveSpeed * deltaTime;
        enemy.position.z += (directionZ / length) * moveSpeed * deltaTime;
        
        // Atualizar posição do mesh
        enemy.mesh.position.set(enemy.position.x, 1, enemy.position.z);
        
        // Rotação para a direção do movimento
        enemy.mesh.rotation.y = Math.atan2(directionX, directionZ);
      }
    } else {
      // Chegou ao final do caminho
      damageEcosystem(enemy.damage);
      
      // Remover inimigo
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
      
      continue;
    }
    
    // Atualizar barra de vida
    enemy.healthBar.scale.x = Math.max(0, enemy.currentHealth / enemy.maxHealth);
    
    // Verificar se inimigo está morto
    if (enemy.currentHealth <= 0) {
      // Recompensar jogador
      resources += enemy.reward;
      document.getElementById('resources').textContent = resources;
      
      // Spawn de minions (para inimigos especiais)
      if (enemy.spawnMinions) {
        for (let j = 0; j < 3; j++) {
          const minion = {
            type: 'minion', 
            health: enemy.health * 0.3, 
            speed: enemy.speed * 1.2, 
            armor: Math.max(0, enemy.armor - 1), 
            damage: Math.floor(enemy.damage * 0.4), 
            reward: Math.floor(enemy.reward * 0.2)
          };
          
          const minionEnemy = createEnemy(minion);
          minionEnemy.pathIndex = enemy.pathIndex;
          minionEnemy.position = {...enemy.position};
          minionEnemy.mesh.position.set(enemy.position.x, 1, enemy.position.z);
        }
      }
      
      // Efeito de área ao morrer (para inimigos especiais)
      if (enemy.areaEffect) {
        // Danificar o ecossistema em área
        damageEcosystem(Math.floor(enemy.damage * 0.5));
        
        // Efeito visual de explosão
        const explosionGeometry = new THREE.SphereGeometry(10, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xff3300,
          transparent: true,
          opacity: 0.6
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.set(enemy.position.x, 1, enemy.position.z);
        scene.add(explosion);
        
        // Remover após animação
        setTimeout(() => {
          scene.remove(explosion);
        }, 500);
      }
      
      // Remover inimigo
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
    }
  }
  
  // Verificar se a onda terminou
  if (waveInProgress && enemies.length === 0) {
    waveInProgress = false;
    
    // Adicionar bônus entre ondas
    ecosystemHealth = Math.min(100, ecosystemHealth + 5);
    document.getElementById('health').textContent = ecosystemHealth;
  }
}

// Atualizar ataques das torres
function updateTowers(deltaTime) {
  for (const tower of towers) {
    tower.lastAttack += deltaTime;
    
    // Verificar se pode atacar
    if (tower.lastAttack >= 1 / tower.attackSpeed) {
      // Encontrar inimigo mais próximo dentro do alcance
      let closestEnemy = null;
      let closestDistance = tower.range;
      
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        
        const dx = tower.position.x - enemy.position.x;
        const dz = tower.position.z - enemy.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance <= tower.range && (closestEnemy === null || distance < closestDistance)) {
          closestEnemy = enemy;
          closestDistance = distance;
        }
      }
      
      // Atacar inimigo mais próximo
      if (closestEnemy) {
        // Resetar temporizador de ataque
        tower.lastAttack = 0;
        
        // Calcular dano
        let damage = tower.damage;
        
        // Verificar efeito crítico
        let isCritical = false;
        if (tower.critChance && Math.random() < tower.critChance) {
          damage *= tower.critMultiplier || 2;
          isCritical = true;
        }
        
        // Aplicar redução de armadura
        if (tower.armorReduction) {
          const effectiveArmor = Math.max(0, closestEnemy.armor - tower.armorReduction);
          damage = damage * (1 - (effectiveArmor * 0.1));
        } else {
          damage = damage * (1 - (closestEnemy.armor * 0.1));
        }
        
        // Aplicar dano
        closestEnemy.currentHealth -= damage;
        
        // Aplicar efeitos adicionais
        if (tower.slowFactor && !closestEnemy.frozen) {
          closestEnemy.speed *= tower.slowFactor;
        }
        
        if (tower.freezeChance && Math.random() < tower.freezeChance) {
          closestEnemy.frozen = true;
          closestEnemy.frozenTimer = 2; // 2 segundos
        }
        
        if (tower.confuseChance && Math.random() < tower.confuseChance) {
          closestEnemy.confused = true;
          closestEnemy.confusedTimer = 3; // 3 segundos
        }
        
        if (tower.dotDamage) {
          closestEnemy.dotEffects.push({
            damagePerSecond: tower.damage * 0.2,
            duration: 3 // 3 segundos
          });
        }
        
        // Aplicar dano em área
        if (tower.areaEffect) {
          for (const enemy of enemies) {
            if (enemy !== closestEnemy && !enemy.dead) {
              const dx = closestEnemy.position.x - enemy.position.x;
              const dz = closestEnemy.position.z - enemy.position.z;
              const distance = Math.sqrt(dx * dx + dz * dz);
              
              if (distance <= 2) { // 2 unidades de raio
                enemy.currentHealth -= damage * 0.5; // 50% do dano principal
              }
            }
          }
        }
        
        // Curar ecossistema para torres de vida
        if (tower.healFactor) {
          ecosystemHealth = Math.min(100, ecosystemHealth + tower.healFactor);
          document.getElementById('health').textContent = Math.floor(ecosystemHealth);
        }
        
        // Efeito visual de ataque
        createAttackEffect(tower, closestEnemy, isCritical);
      }
    }
    
    // Aplicar buffs de aura para torres próximas
    if (tower.auraBuff) {
      for (const otherTower of towers) {
        if (otherTower !== tower) {
          const dx = tower.position.x - otherTower.position.x;
          const dz = tower.position.z - otherTower.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance <= tower.auraRange) {
            // Aplicar buff temporário
            otherTower.tempBuff = tower.auraBuff;
          }
        }
      }
    }
  }
}

// Criar efeito visual de ataque
function createAttackEffect(tower, enemy, isCritical) {
  // Geometria e material para o efeito de ataque
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ 
    color: ELEMENTOS[tower.elemento]?.cor || 0xffffff,
    transparent: true,
    opacity: 0.8
  });
  
  // Criar linha de ataque
  const points = [
    new THREE.Vector3(tower.position.x, 1.5, tower.position.z),
    new THREE.Vector3(enemy.position.x, 1, enemy.position.z)
  ];
  geometry.setFromPoints(points);
  
  const attackLine = new THREE.Line(geometry, material);
  scene.add(attackLine);
  
  // Mostrar dano numérico
  if (isCritical) {
    // Texto para dano crítico
    const textSprite = createTextSprite("CRÍTICO!", 0xff0000);
    textSprite.position.set(enemy.position.x, 2, enemy.position.z);
    scene.add(textSprite);
    
    // Animar e remover após um tempo
    let opacity = 1;
    const textInterval = setInterval(() => {
      opacity -= 0.05;
      textSprite.material.opacity = opacity;
      textSprite.position.y += 0.05;
      
      if (opacity <= 0) {
        clearInterval(textInterval);
        scene.remove(textSprite);
      }
    }, 50);
  }
  
  // Remover linha de ataque após curto período
  setTimeout(() => {
    scene.remove(attackLine);
  }, 200);
}

// Criar texto sprite para dano
function createTextSprite(text, color) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 128;
  canvas.height = 64;
  
  context.font = '24px Arial';
  context.fillStyle = '#' + (color || 0xffffff).toString(16).padStart(6, '0');
  context.fillText(text, 0, 32);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true,
    opacity: 1
  });
  
  return new THREE.Sprite(material);
}

// Dano ao ecossistema
function damageEcosystem(damage) {
  ecosystemHealth -= damage;
  document.getElementById('health').textContent = Math.floor(ecosystemHealth);
  
  // Game over
  if (ecosystemHealth <= 0) {
    gameOver();
  }
}

// Game over
function gameOver() {
  waveInProgress = false;
  
  // Criar overlay de game over
  const gameOverDiv = document.createElement('div');
  gameOverDiv.style.position = 'absolute';
  gameOverDiv.style.top = '0';
  gameOverDiv.style.left = '0';
  gameOverDiv.style.width = '100%';
  gameOverDiv.style.height = '100%';
  gameOverDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  gameOverDiv.style.color = 'white';
  gameOverDiv.style.display = 'flex';
  gameOverDiv.style.flexDirection = 'column';
  gameOverDiv.style.justifyContent = 'center';
  gameOverDiv.style.alignItems = 'center';
  gameOverDiv.style.zIndex = '1000';
  gameOverDiv.style.fontFamily = 'Arial, sans-serif';
  
  gameOverDiv.innerHTML = `
    <h1>Fim de Jogo</h1>
    <p>O ecossistema entrou em colapso!</p>
    <p>Você sobreviveu até a onda ${wave}</p>
    <button id="restart-game" style="padding: 10px 20px; margin-top: 20px; font-size: 18px;">Recomeçar</button>
  `;
  
  document.body.appendChild(gameOverDiv);
  
  // Adicionar evento para reiniciar
  document.getElementById('restart-game').addEventListener('click', () => {
    location.reload();
  });
}

// Loop de animação
function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = Math.min(0.1, clock.getDelta()); // Limitar delta para evitar problemas com inatividade
  
  // Atualizar controles
  controls.update();
  
  // Atualizar inimigos
  if (waveInProgress) {
    updateEnemies(deltaTime);
    updateTowers(deltaTime);
  }
  
  // Renderizar cena
  renderer.render(scene, camera);
}

// Melhorar a iluminação da cena
function enhanceSceneLighting() {
  // Luz ambiente mais suave
  scene.remove(scene.getObjectByName('ambientLight'));
  const ambientLight = new THREE.AmbientLight(0x1a1a1a, 0.4);
  ambientLight.name = 'ambientLight';
  scene.add(ambientLight);
  
  // Luz direcional principal
  scene.remove(scene.getObjectByName('mainLight'));
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(-10, 30, 10);
  mainLight.castShadow = true;
  mainLight.shadow.camera.near = 0.1;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -20;
  mainLight.shadow.camera.right = 20;
  mainLight.shadow.camera.top = 20;
  mainLight.shadow.camera.bottom = -20;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.name = 'mainLight';
  scene.add(mainLight);
  
  // Luz de preenchimento suave
  scene.remove(scene.getObjectByName('fillLight'));
  const fillLight = new THREE.DirectionalLight(0x4444ff, 0.3);
  fillLight.position.set(10, 20, -10);
  fillLight.name = 'fillLight';
  scene.add(fillLight);
}

// Iniciar o jogo quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', init); 