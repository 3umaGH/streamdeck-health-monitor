import { action, DidReceiveSettingsEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from '@elgato/streamdeck'
import { createCanvas } from 'canvas'
import fetch from 'node-fetch'

type AnyEvent = WillAppearEvent<Settings> | DidReceiveSettingsEvent<Settings> | KeyUpEvent<Settings>

type InstanceState = {
  intervalId?: NodeJS.Timeout
}

@action({ UUID: 'com.3uma.healthmonitor.increment' })
export class IncrementCounter extends SingletonAction<Settings> {
  private readonly instances = new Map<string, InstanceState>()

  private getInstance(id: string): InstanceState {
    if (!this.instances.has(id)) this.instances.set(id, {})
    return this.instances.get(id)!
  }

  override onWillAppear(ev: WillAppearEvent<Settings>): void | Promise<void> {
    ev.action.setImage(this.createKeyImage('#000000ff', 'Loading...'))
    return this.startTimer(ev)
  }

  override onWillDisappear(ev: WillDisappearEvent<Settings>): void | Promise<void> {
    const state = this.instances.get(ev.action.id)
    if (state?.intervalId) clearInterval(state.intervalId)
    this.instances.delete(ev.action.id)
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>): void | Promise<void> {
    const state = this.getInstance(ev.action.id)
    if (state.intervalId) clearInterval(state.intervalId)
    state.intervalId = setTimeout(() => this.startTimer(ev), 1000) as unknown as NodeJS.Timeout
  }

  override onKeyUp(ev: KeyUpEvent<Settings>): Promise<void> | void {
    return this.startTimer(ev)
  }

  private async startTimer(ev: AnyEvent): Promise<void> {
    const settings = await ev.action.getSettings()

    if (!settings?.path) {
      ev.action.setImage(this.createKeyImage('#555555', 'No path'))
      return
    }

    const state = this.getInstance(ev.action.id)
    if (state.intervalId) clearInterval(state.intervalId)

    await this.updateStatus(ev, settings.path)
    state.intervalId = setInterval(() => this.updateStatus(ev, settings.path), settings.intervalMs ?? 5000)
  }

  private async updateStatus(ev: AnyEvent, path: string | undefined): Promise<void> {
    if (!path) {
      return
    }

    try {
      const settings = await ev.action.getSettings()
      const res = await fetch(path)
      const ok = res.status == (settings.okStatusCode ?? 200)
      const status = ok ? `OK (${res.status})` : `ERR (${res.status})`
      const time = new Date().toLocaleTimeString()
      const lines = [settings.title, status, ' ', time].filter(Boolean)
      ev.action.setImage(this.createKeyImage(ok ? '#1a7a1a' : '#8b0000', lines.join('\n')))
      ev.action.setTitle('')
    } catch (err) {
      ev.action.setImage(this.createKeyImage('#8b0000', err instanceof Error ? err.message : 'ERR'))
      ev.action.setTitle('')
    }
  }
  private createKeyImage(bgColor: string, text: string): string {
    const size = 144
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = text.split('\n').filter(Boolean)
    const lineHeight = 28
    ctx.font = 'bold 22px Arial'
    const startY = size / 2 - ((lines.length - 1) * lineHeight) / 2
    lines.forEach((line, i) => ctx.fillText(line, size / 2, startY + i * lineHeight))

    return canvas.toDataURL('image/png')
  }
}

type Settings = {
  title?: string
  path?: string
  okStatusCode?: number
  intervalMs?: number
}
