import { Component, EventEmitter, NgZone, Output, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { WebcamImage, WebcamInitError, WebcamModule } from 'ngx-webcam';
import { Observable, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { InfodialogComponent } from '../../components/infodialog/infodialog.component';
import { LucideAngularModule } from 'lucide-angular';
import { LoadinganimationComponent } from '../loadinganimation/loadinganimation.component';

@Component({
  selector: 'app-camara',
  standalone: true,
  imports: [CommonModule, WebcamModule, InfodialogComponent, LucideAngularModule, LoadinganimationComponent],
  templateUrl: './camara.component.html',
  styleUrl: './camara.component.css'
})
export class CamaraComponent implements OnInit, OnDestroy {
  @Output() imageCaptured = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('webcamElement') webcamElement?: ElementRef<HTMLElement>;

  generalError: string | null = null;
  stream: MediaStream | null = null;
  trigger: Subject<void> = new Subject();

  facingMode: string = 'user';
  isSwitchingCamera: boolean = false;
  isLoadingCamera: boolean = false;
  videoDevices: MediaDeviceInfo[] = [];
  currentDeviceId: string | null = null;
  currentDeviceIndex: number = 0;
  permissionGranted: boolean = false;
  forceWebcamRecreation: boolean = false;
  lastUsedFacingMode: string = 'user';
  private errorTimeoutId: any = null;
  private previousSessionData: { facingMode: string, deviceId: string | null, zoomLevel?: number } | null = null;

  zoomLevel: number = 1;
  maxZoom: number = 5;
  minZoom: number = 1;
  initialDistance: number = 0;
  isMobileZooming: boolean = false;
  nativeZoomSupported: boolean = false;
  currentVideoTrack: MediaStreamTrack | null = null;
  webcamVideo: HTMLVideoElement | null = null;
  zoomSpeed: number = 0.2;

  constructor(private zone: NgZone) { }

  ngOnInit() {
    try {
      const savedData = localStorage.getItem('camaraConfig');
      if (savedData) {
        this.previousSessionData = JSON.parse(savedData);
        this.facingMode = this.previousSessionData?.facingMode || 'user';
        this.lastUsedFacingMode = this.previousSessionData?.facingMode || 'user';
        this.currentDeviceId = this.previousSessionData?.deviceId || null;
        this.zoomLevel = this.previousSessionData?.zoomLevel || 1;
      }
    } catch (e) {
      console.warn('Error al recuperar configuración anterior:', e);
    }

    this.checkMediaDevicesSupport();
  }

  checkMediaDevicesSupport() {
    if (!navigator.mediaDevices) {
      this.setErrorWithTimeout('Tu navegador no soporta acceso a cámara', 5000);
      return;
    }

    if (typeof navigator.mediaDevices.getUserMedia !== 'function') {
      this.setErrorWithTimeout('Tu navegador no soporta acceso a cámara (getUserMedia no disponible)', 5000);
      return;
    }

    setTimeout(() => {
      this.silentInitialization();
    }, 500);
  }

  ngOnDestroy() {
    try {
      const configToSave = {
        facingMode: this.facingMode,
        deviceId: this.currentDeviceId,
        zoomLevel: this.zoomLevel
      };
      localStorage.setItem('camaraConfig', JSON.stringify(configToSave));
    } catch (e) {
      console.warn('Error al guardar configuración:', e);
    }
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
    }
    this.closeCamera();
  }

  private async silentInitialization() {
    let showErrors = false;

    try {
      if (this.isMobileDevice()) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.activateCamera(false);
      } else {
        await this.enumerateVideoDevices(false);
        await new Promise(resolve => setTimeout(resolve, 300));
        await this.activateCamera(false);
      }
      setTimeout(() => {
        showErrors = true;
      }, 1000);

    } catch (error) {
      setTimeout(() => {
        showErrors = true;
        this.zone.run(() => {
          this.generalError = null;
        });
      }, 1000);
    }
  }

  get $trigger(): Observable<void> {
    return this.trigger.asObservable();
  }

  snapshot(event: WebcamImage) {
    this.lastUsedFacingMode = this.facingMode;
    this.closeCamera();
    this.imageCaptured.emit(event.imageAsDataUrl);
  }

  async enumerateVideoDevices(showErrors: boolean = true): Promise<MediaDeviceInfo[]> {
    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('API de MediaDevices no disponible en este navegador');
      }

      if (!this.permissionGranted) {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
        this.permissionGranted = true;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      this.videoDevices = videoDevices;

      if (this.currentDeviceId && videoDevices.length > 0) {
        const deviceIndex = videoDevices.findIndex(device => device.deviceId === this.currentDeviceId);
        if (deviceIndex !== -1) {
          this.currentDeviceIndex = deviceIndex;
        } else {
          this.currentDeviceId = videoDevices[0].deviceId;
          this.currentDeviceIndex = 0;
        }
      } else if (videoDevices.length > 0) {
        this.currentDeviceId = videoDevices[0].deviceId;
        this.currentDeviceIndex = 0;
      }
      return videoDevices;
    } catch (error) {
      if (showErrors) {
        this.setErrorWithTimeout('No se pudieron detectar dispositivos de video.', 3000);
      }
      return [];
    }
  }

  async switchCamera() {
    if (this.isSwitchingCamera) {
      return;
    }
    this.isSwitchingCamera = true;
    this.isLoadingCamera = true;
    this.generalError = null;

    this.zoomLevel = 1;

    try {
      if (this.stream) {
        this.stream.getTracks().forEach((track: MediaStreamTrack) => {
          track.stop();
        });
        this.stream = null;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      if (this.isMobileDevice()) {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        this.lastUsedFacingMode = this.facingMode;
        this.forceWebcamRecreation = true;
        this.zone.run(() => { });
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      else {
        const devices = await this.enumerateVideoDevices();
        if (devices.length <= 1) {
          this.setErrorWithTimeout('No hay cámaras adicionales disponibles para cambiar.', 3000);
          this.isLoadingCamera = false;
          this.isSwitchingCamera = false;
          return;
        }
        this.currentDeviceIndex = (this.currentDeviceIndex + 1) % devices.length;
        const newDeviceId = devices[this.currentDeviceIndex].deviceId;
        this.currentDeviceId = newDeviceId;
        this.forceWebcamRecreation = true;
        this.zone.run(() => { });
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      await this.activateCamera(true);
      setTimeout(() => {
        this.forceWebcamRecreation = false;
        this.zone.run(() => { });
      }, 800);
    } catch (error) {
      this.setErrorWithTimeout('Error al cambiar de cámara: ' + (error instanceof Error ? error.message : String(error)), 3000);
      try {
        if (!this.stream) {
          await this.activateCamera(true);
        }
      } catch (e) {
        console.error('Error al recuperar la cámara:', e);
      }
    } finally {
      setTimeout(() => {
        this.isSwitchingCamera = false;
        this.isLoadingCamera = false;
        this.zone.run(() => { });
      }, 500);
    }
  }

  private setErrorWithTimeout(errorMessage: string, timeoutMs: number = 3000) {
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
    }
    this.zone.run(() => {
      this.generalError = errorMessage;
    });
    this.errorTimeoutId = setTimeout(() => {
      this.zone.run(() => {
        this.generalError = null;
      });
    }, timeoutMs);
  }

  async activateCamera(showErrors: boolean = true): Promise<void> {
    this.isLoadingCamera = true;
    if (showErrors) {
      this.generalError = null;
    }

    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('API de MediaDevices no disponible en este navegador');
      }

      let constraints: MediaStreamConstraints;
      if (this.isMobileDevice()) {
        constraints = {
          video: {
            facingMode: this.facingMode,
            width: { ideal: 1280, min: 640, max: 1920 },
            height: { ideal: 720, min: 480, max: 1080 },
            aspectRatio: { ideal: 1.777777778 }
          }
        };
      } else {
        if (this.currentDeviceId) {
          constraints = {
            video: {
              deviceId: { exact: this.currentDeviceId },
              width: { ideal: 1280, min: 640, max: 1920 },
              height: { ideal: 720, min: 480, max: 1080 },
              aspectRatio: { ideal: 1.777777778 }
            }
          };
        } else {
          constraints = {
            video: {
              width: { ideal: 1280, min: 640, max: 1920 },
              height: { ideal: 720, min: 480, max: 1080 },
              aspectRatio: { ideal: 1.777777778 }
            }
          };
        }
      }
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.stream) {
        const track = this.stream.getVideoTracks()[0];
        if (track) {
          this.currentVideoTrack = track;
          const settings = track.getSettings();

          const capabilities = track.getCapabilities ? track.getCapabilities() : null;
          this.nativeZoomSupported = !!(capabilities && 'zoom' in capabilities);

          if (!this.isMobileDevice() && settings.deviceId && settings.deviceId !== this.currentDeviceId) {
            this.currentDeviceId = settings.deviceId;
          }
          if (!this.isMobileDevice() && this.videoDevices.length > 0) {
            const newIndex = this.videoDevices.findIndex(d => d.deviceId === this.currentDeviceId);
            if (newIndex !== -1) {
              this.currentDeviceIndex = newIndex;
            }
          }
        }
        this.permissionGranted = true;
        if (showErrors) {
          this.generalError = null;
        }

        if (this.zoomLevel !== 1) {
          setTimeout(() => {
            this.applyZoom(this.zoomLevel);
          }, 500);
        }
      }
    } catch (error) {
      if (showErrors) {
        this.setErrorWithTimeout('No se pudo activar la cámara: ' + (error instanceof Error ? error.message : String(error)), 3000);
      }
      throw error;
    } finally {
      this.isLoadingCamera = false;
      this.zone.run(() => { });
    }
  }

  closeCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
      });
      this.stream = null;
      this.close.emit();
      this.zone.run(() => { });
    } else {
      this.close.emit();
    }
  }

  captureImage() {
    this.trigger.next();
  }

  isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }

  handleInitError(error: WebcamInitError): void {
    if (this.isMobileDevice()) {
      setTimeout(() => {
        this.switchCamera();
      }, 500);
    } else {
      this.setErrorWithTimeout(`Error al inicializar la cámara: ${error.message}`, 3000);
    }
  }

  @HostListener('wheel', ['$event'])
  onMouseWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = Math.sign(event.deltaY) * -this.zoomSpeed;
    this.adjustZoom(delta);
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      this.initialDistance = this.getTouchDistance(event);
      this.isMobileZooming = true;
      event.preventDefault();
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isMobileZooming && event.touches.length === 2) {
      event.preventDefault();

      const currentDistance = this.getTouchDistance(event);

      if (this.initialDistance > 0) {
        // Aumentamos la respuesta al pellizco
        const zoomFactor = Math.pow(currentDistance / this.initialDistance, 1.5);

        const newZoom = this.zoomLevel * zoomFactor;
        const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        if (clampedZoom !== this.zoomLevel) {
          this.applyZoom(clampedZoom);
        }

        this.initialDistance = currentDistance;
      }
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd() {
    this.isMobileZooming = false;
    this.initialDistance = 0;
  }

  zoomIn() {
    this.adjustZoom(0.5);
  }

  zoomOut() {
    this.adjustZoom(-0.5);
  }

  resetZoom() {
    this.applyZoom(1);
  }

  private adjustZoom(delta: number) {
    const newZoom = this.zoomLevel + delta;
    const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    if (clampedZoom !== this.zoomLevel) {
      this.applyZoom(clampedZoom);
    }
  }

  private applyZoom(zoomLevel: number) {
    this.zoomLevel = zoomLevel;

    setTimeout(() => {
      if (!this.webcamVideo) {
        this.webcamVideo = document.querySelector('.webcam-wrapper video') as HTMLVideoElement;
      }

      if (this.webcamVideo) {
        const shouldMirror = this.facingMode === 'user';
        const scaleX = shouldMirror ? -this.zoomLevel : this.zoomLevel;

        this.webcamVideo.style.transform = `scale(${scaleX}, ${this.zoomLevel})`;
        this.webcamVideo.style.transition = 'transform 0.2s ease-out';
      }

      if (this.nativeZoomSupported && this.currentVideoTrack && 'applyConstraints' in this.currentVideoTrack) {
        try {
          const capabilities = this.currentVideoTrack.getCapabilities();
          if (capabilities && 'zoom' in capabilities) {
            const zoomCapability = capabilities.zoom as { min?: number, max?: number };
            const minZoom = zoomCapability.min || 1;
            const maxZoom = zoomCapability.max || 10;

            const nativeZoomValue = minZoom + (zoomLevel - 1) * (maxZoom - minZoom) / (this.maxZoom - 1);

            this.currentVideoTrack.applyConstraints({
              advanced: [{ zoom: nativeZoomValue } as any]
            }).catch(e => {
              console.warn('No se pudo aplicar zoom nativo:', e);
            });
          }
        } catch (e) {
          console.warn('Error al aplicar zoom nativo:', e);
        }
      }

      this.zone.run(() => { });
    }, 100);
  }

  private getTouchDistance(event: TouchEvent): number {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }

  onInitSuccess() {
    setTimeout(() => {
      this.webcamVideo = document.querySelector('.webcam-wrapper video') as HTMLVideoElement;
      if (this.webcamVideo) {
        this.webcamVideo.style.objectFit = 'cover';

        if (this.facingMode === 'user') {
          this.webcamVideo.style.transform = 'scaleX(-1)';
        }

        if (this.zoomLevel !== 1) {
          this.applyZoom(this.zoomLevel);
        }
      }
    }, 500);
  }
}