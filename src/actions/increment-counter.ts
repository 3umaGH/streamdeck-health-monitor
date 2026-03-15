import { action, DidReceiveSettingsEvent, KeyUpEvent, SingletonAction, WillAppearEvent } from '@elgato/streamdeck'
import { createCanvas } from 'canvas'
import fetch from 'node-fetch'

/**
 * An example action class that displays a count that increments by one each time the button is pressed.
 */
@action({ UUID: 'com.3uma.healthmonitor.increment' })
export class IncrementCounter extends SingletonAction<Settings> {
  private intervalId?: NodeJS.Timeout

  /**
   * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
   * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
   * we're setting the title to the "count" that is incremented in {@link IncrementCounter.onKeyDown}.
   */
  override onWillAppear(ev: WillAppearEvent<Settings>): void | Promise<void> {
    this.startTimer(ev)
    ev.action.setImage(this.createKeyImage('#000000ff', 'Loading...'))
    return
  }

  override onDidReceiveSettings?(ev: DidReceiveSettingsEvent<Settings>): void | Promise<void> {
    return this.debounce(() => this.startTimer(ev), 1000)()
  }

  override onKeyUp(ev: KeyUpEvent<Settings>): Promise<void> | void {
    return this.startTimer(ev)
  }

  private debounce(fn: () => void, delay: number): () => void {
    let timeoutId: NodeJS.Timeout | null = null
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        fn()
        timeoutId = null
      }, delay)
    }
  }

  private async startTimer(
    ev: WillAppearEvent<Settings> | DidReceiveSettingsEvent<Settings> | KeyUpEvent<Settings>,
  ): Promise<void> {
    const settings = await ev.action.getSettings()

    if (!settings?.path) {
      ev.action.setTitle('No path')
      return
    }

    this.updateStatus(ev, settings.path)

    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
    this.intervalId = setInterval(() => this.updateStatus(ev, settings.path), settings.intervalMs ?? 5000)
  }

  private async updateStatus(
    ev: WillAppearEvent<Settings> | DidReceiveSettingsEvent<Settings> | KeyUpEvent<Settings>,
    path: string | undefined,
  ): Promise<void> {
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
