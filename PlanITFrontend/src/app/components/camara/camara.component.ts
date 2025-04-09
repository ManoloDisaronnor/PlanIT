import { Component, EventEmitter, NgZone, Output, OnInit, OnDestroy } from '@angular/core';
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
  private previousSessionData: { facingMode: string, deviceId: string | null } | null = null;

  constructor(private zone: NgZone) { }

  ngOnInit() {
    try {
      const savedData = localStorage.getItem('camaraConfig');
      if (savedData) {
        this.previousSessionData = JSON.parse(savedData);
        this.facingMode = this.previousSessionData!!.facingMode;
        this.lastUsedFacingMode = this.previousSessionData!!.facingMode;
        this.currentDeviceId = this.previousSessionData!!.deviceId;
      }
    } catch (e) {
      console.warn('Error al recuperar configuración anterior:', e);
    }

    this.silentInitialization();
  }

  ngOnDestroy() {
    try {
      const configToSave = {
        facingMode: this.facingMode,
        deviceId: this.currentDeviceId
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
      console.warn('Error durante la inicialización silenciosa:', error);
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
      console.error('Error al enumerar dispositivos:', error);
      if (showErrors) {
        this.setErrorWithTimeout('No se pudieron detectar dispositivos de video.', 3000);
      }
      return [];
    }
  }

  async switchCamera() {
    if (this.isSwitchingCamera) {
      console.log('Ya se está cambiando la cámara, ignorando solicitud...');
      return;
    }
    this.isSwitchingCamera = true;
    this.isLoadingCamera = true;
    this.generalError = null;
    try {
      if (this.stream) {
        this.stream.getTracks().forEach((track: MediaStreamTrack) => {
          console.log('Deteniendo track:', track.label);
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
      console.error('Error al cambiar la cámara:', error);
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
          const settings = track.getSettings();
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
      }
    } catch (error) {
      console.error('Error al activar la cámara:', error);
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

  // Detector de móviles
  isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }
  handleInitError(error: WebcamInitError): void {
    console.error('Error de inicialización de webcam:', error);
    if (this.isMobileDevice()) {
      setTimeout(() => {
        this.switchCamera();
      }, 500);
    } else {
      this.setErrorWithTimeout(`Error al inicializar la cámara: ${error.message}`, 3000);
    }
  }
}