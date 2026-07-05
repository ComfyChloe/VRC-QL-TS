// ─────────────────────────────────────────────────────────
//  lib/argBuilder.ts — pure function that converts a
//  LaunchProfile into the string[] of CLI args to pass
//  to VRChat.exe. No side effects.
// ─────────────────────────────────────────────────────────
import type { LaunchProfile } from './types'

export interface LaunchArgOverrides {
  vr?: boolean
}

const JOIN_LINK_PREFIX = 'vrchat://launch?id='

export function buildArgs(profile: LaunchProfile, overrides: LaunchArgOverrides = {}): string[] {
  const args: string[] = []
  const vrEnabled = overrides.vr ?? profile.vr

  // ── General ──────────────────────────────────────────────
  if (!vrEnabled) args.push('--no-vr')
  if (profile.profileIndex !== 0) args.push(`--profile=${profile.profileIndex}`)

  // ── Debug ────────────────────────────────────────────────
  const d = profile.debug
  if (d.gui)        args.push('--enable-debug-gui')
  if (d.sdkLog)     args.push('--enable-sdk-log-levels')
  if (d.udonLog)    args.push('--enable-udon-debug-logging')
  if (d.verboseLog) args.push('--enable-verbose-logging')
  if (d.watchWorlds)   args.push('--watch-worlds')
  if (d.watchAvatars)  args.push('--watch-avatars')

  // ── Creator ───────────────────────────────────────────────
  const c = profile.creator
  if (c.osc.enabled) {
    args.push(`--osc=${c.osc.inPort}:${c.osc.senderIp}:${c.osc.outPort}`)
  }
  if (c.midi.trim()) args.push(`--midi=${c.midi.trim()}`)

  // ── Performance ───────────────────────────────────────────
  const p = profile.performance
  if (p.maxFps !== null)           args.push(`--fps=${p.maxFps}`)
  if (p.affinity.trim())           args.push(`--affinity=${p.affinity.trim()}`)
  if (p.processPriority !== null)  args.push(`--process-priority=${p.processPriority}`)
  if (p.mainThreadPriority !== null) args.push(`--main-thread-priority=${p.mainThreadPriority}`)

  // ── IK ────────────────────────────────────────────────────
  const ik = profile.ik
  if (ik.legacyFbtCalibrate)          args.push('--legacyfbt-calibrate')
  if (ik.disableShoulderTracking)     args.push('--disable-shoulder-tracking')
  if (ik.freezeTrackingOnDisconnect)  args.push('--freeze-tracking-on-disconnect')
  // No shell involved — embedded quotes would reach VRChat literally and break the flag
  if (ik.customArmRatio.trim())       args.push(`--custom-arm-ratio=${ik.customArmRatio.trim()}`)

  // ── System ────────────────────────────────────────────────
  const s = profile.system
  if (s.skipRegistryInstall)        args.push('--skip-registry-install')
  if (s.hwVideoDecode === 'on')     args.push('--enable-hw-video-decoding')
  if (s.hwVideoDecode === 'off')    args.push('--disable-hw-video-decoding')
  if (s.disableAmdStutterWorkaround) args.push('--disable-amd-stutter-workaround')

  // ── Display (Unity flags) ─────────────────────────────────
  const disp = profile.display
  if (disp.screenWidth  !== null) args.push('-screen-width',      String(disp.screenWidth))
  if (disp.screenHeight !== null) args.push('-screen-height',     String(disp.screenHeight))
  if (disp.fullscreen   !== null) args.push('-screen-fullscreen', disp.fullscreen ? '1' : '0')
  if (disp.monitor      !== null) args.push('-monitor',           String(disp.monitor))

  // ── Instance ──────────────────────────────────────────────
  const inst = profile.instance
  if (inst.mode === 'join' && inst.joinLink.trim()) {
    args.push(normalizeJoinLink(inst.joinLink))
  }
  if (inst.mode === 'local') {
    args.push('--watch-worlds')
    if (inst.localWorld.trim()) {
      args.push(inst.localWorld.trim())
    }
  }
  // 'create' / 'none' have no standalone CLI flags;
  // the launcher constructs a vrchat:// URI which VRChat.exe
  // accepts as a positional arg when mode === 'create'.
  if (inst.mode === 'create' && inst.worldId.trim()) {
    const region = inst.region ?? 'us-w'
    const type   = encodeURIComponent(inst.type)
    const uri = `vrchat://launch?worldId=${inst.worldId.trim()}&instanceId=${inst.instanceId}~${type}(${inst.ownerId})~region(${region})~nonce(${inst.nonce})`
    args.push(uri)
  }

  // ── Custom params (always last) ───────────────────────────
  if (profile.customParams.trim()) {
    args.push(...profile.customParams.trim().split(/\s+/))
  }

  return args
}

/** Returns the full command string for display / copy purposes. */
export function buildCommandPreview(exePath: string, profile: LaunchProfile): string {
  const args = buildArgs(profile)
  return [exePath, ...args].join(' ')
}

function normalizeJoinLink(joinLink: string): string {
  const trimmed = joinLink.trim()
  if (!trimmed) return ''
  if (/^vrchat:\/\/launch\?/i.test(trimmed)) {
    return trimmed
  }
  return `${JOIN_LINK_PREFIX}${trimmed}`
}
