// ─────────────────────────────────────────────────────────
//  lib/types.ts — all shared data model interfaces
// ─────────────────────────────────────────────────────────

export interface VRCInstall {
  id: string
  name: string
  exePath: string
  lastUsed: string | null
  addedAt: string
}

export interface OscConfig {
  enabled: boolean
  inPort: number
  senderIp: string
  outPort: number
}

export interface DebugOptions {
  gui: boolean
  sdkLog: boolean
  udonLog: boolean
  verboseLog: boolean
  watchWorlds: boolean
  watchAvatars: boolean
}

export interface CreatorOptions {
  osc: OscConfig
  midi: string
}

export interface PerformanceOptions {
  maxFps: number | null
  affinity: string
  processPriority: number | null
  mainThreadPriority: number | null
}

export interface IkOptions {
  legacyFbtCalibrate: boolean
  disableShoulderTracking: boolean
  freezeTrackingOnDisconnect: boolean
  customArmRatio: string
}

export interface SystemOptions {
  skipRegistryInstall: boolean
  hwVideoDecode: 'default' | 'on' | 'off'
  disableAmdStutterWorkaround: boolean
}

export interface DisplayOptions {
  screenWidth: number | null
  screenHeight: number | null
  fullscreen: boolean | null
  monitor: number | null
}

export type InstanceMode = 'create' | 'join' | 'local' | 'none'
export type InstanceType = 'public' | 'friends+' | 'friends' | 'invite+' | 'invite'
export type InstanceRegion = 'us-w' | 'us-e' | 'eu' | 'jp'

export interface InstanceConfig {
  mode: InstanceMode
  worldId: string
  instanceId: string
  ownerId: string
  nonce: string
  type: InstanceType
  region: InstanceRegion
  joinLink: string
  localWorld: string
}

export interface LaunchProfile {
  id: string
  name: string
  description: string
  tags: string[]
  installId: string
  profileIndex: number
  vr: boolean
  debug: DebugOptions
  creator: CreatorOptions
  performance: PerformanceOptions
  ik: IkOptions
  system: SystemOptions
  display: DisplayOptions
  instance: InstanceConfig
  customParams: string
  enabled: boolean
  useGlobalOptions: boolean
  createdAt: string
  updatedAt: string
}

export interface AppTheme {
  accentColor: string
  backgroundColor: string
  surfaceColor: string
}

export interface AppWindowConfig {
  rememberSize: boolean
  autoLayoutColumns: number
}

export interface GlobalLaunchOptions {
  debug: DebugOptions
  creator: CreatorOptions
  performance: PerformanceOptions
  ik: IkOptions
  system: SystemOptions
  display: DisplayOptions
}

export interface AppConfig {
  installs: VRCInstall[]
  profiles: LaunchProfile[]
  theme: AppTheme
  window: AppWindowConfig
  globalOptions: GlobalLaunchOptions
}

// ── Default factory functions ────────────────────────────────

export function defaultProfile(id: string): LaunchProfile {
  return {
    id,
    name: 'New Profile',
    description: '',
    tags: [],
    installId: '',
    profileIndex: 0,
    vr: true,
    debug: {
      gui: false,
      sdkLog: false,
      udonLog: false,
      verboseLog: false,
      watchWorlds: false,
      watchAvatars: false
    },
    creator: {
      osc: { enabled: false, inPort: 9001, senderIp: '127.0.0.1', outPort: 9000 },
      midi: ''
    },
    performance: { maxFps: null, affinity: '', processPriority: null, mainThreadPriority: null },
    ik: {
      legacyFbtCalibrate: false,
      disableShoulderTracking: false,
      freezeTrackingOnDisconnect: false,
      customArmRatio: ''
    },
    system: { skipRegistryInstall: false, hwVideoDecode: 'default', disableAmdStutterWorkaround: false },
    display: { screenWidth: null, screenHeight: null, fullscreen: null, monitor: null },
    instance: {
      mode: 'none',
      worldId: '',
      instanceId: '',
      ownerId: '',
      nonce: '',
      type: 'friends',
      region: 'us-w',
      joinLink: '',
      localWorld: ''
    },
    customParams: '',
    enabled: false,
    useGlobalOptions: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export function defaultConfig(): AppConfig {
  const blank = defaultProfile('__global__')
  return {
    installs: [],
    profiles: [],
    theme: {
      accentColor: '#7c6aef',
      backgroundColor: '#161616',
      surfaceColor: '#202020'
    },
    window: { rememberSize: true, autoLayoutColumns: 2 },
    globalOptions: {
      debug: blank.debug,
      creator: blank.creator,
      performance: blank.performance,
      ik: blank.ik,
      system: blank.system,
      display: blank.display
    }
  }
}
