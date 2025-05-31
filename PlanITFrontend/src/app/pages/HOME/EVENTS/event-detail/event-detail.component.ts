import {
  Component,
  ElementRef,
  HostListener,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { apiUrl } from '../../../../../../config/config';
import {
  getCurrentUser,
  setSessionStorage,
} from '../../../../../../config/authUser';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { CommonModule } from '@angular/common';
import { LoadinganimationComponent } from '../../../../components/loadinganimation/loadinganimation.component';
import { InfodialogComponent } from '../../../../components/infodialog/infodialog.component';
import { CamaraComponent } from '../../../../components/camara/camara.component';
import { MapsComponent } from "../COMPONENTS/maps/maps.component";

interface ImageState {
  imageUrl: string;
  uploaded_at: string;
  userUploaded_user: {
    username: string;
    imageUrl: string;
  };
  isLoaded: boolean;
  hasError: boolean;
}

@Component({
  selector: 'app-event-detail',
  imports: [
    CommonModule,
    RouterLink,
    LoadinganimationComponent,
    InfodialogComponent,
    CamaraComponent,
    MapsComponent
],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css',
})
export class EventDetailComponent {
  eventId!: string;
  apiUrl = apiUrl;
  userUid!: string;
  username!: string;
  userImage!: string;

  today = new Date();

  eventNotShowingError: string | null = null;

  loadingEventInfo = true;
  eventInfo: any | null = null;
  userCanUploadImage = false;
  showJoinBtn = false;
  showImageActionsMenu = false;
  showCamera = false;
  previewImage: string = '';
  imageFile: File | null = null;

  showFullScreenImage: any | null = null;
  zoomLevel = 1;
  translateX = 0;
  translateY = 0;
  isDragging = false;
  lastPanX = 0;
  lastPanY = 0;

  lastTouchDistance = 0;
  isZooming = false;

  loadingJoin = false;
  loadingImageUpload = false;

  generalError: string | null = null;

  showUploadedByLabel: string | null = null;
  showDescriptionFilter: any | null = null;
  tooltipPosition = { top: 0, left: 0 };
  showTooltip = false;

  imageStates = signal<Map<string, ImageState>>(new Map());

  private paramSub?: Subscription;

  private dotLottieInstance!: DotLottie;

  @ViewChild('lottieCanvas', { static: false })
  lottieCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild('menuContainer') menuContainer!: ElementRef;

  constructor(private route: ActivatedRoute) {}

  async ngOnInit() {
    await this.getUserId().then(() => {
      this.paramSub = this.route.params.subscribe((params) => {
        this.eventId = params['eventId'];
        this.loadEventDetailedInfo();
        if (!this.eventId || this.eventId.length !== 28) {
          this.eventNotShowingError =
            'No hemos recibido correctamente los datos del evento que querias ver, prueba a entrar de nuevo en el evento desde la pestaña de eventos.';
          setTimeout(() => {
            this.initializeLottie();
          }, 0);
        }
      });
    });
  }

  ngAfterViewInit(): void {
    if (this.eventNotShowingError) {
      this.initializeLottie();
    }
  }

  ngOnDestroy(): void {
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
    }
    this.paramSub?.unsubscribe();
  }

  openFullScreenImage(image: any): void {
    this.showFullScreenImage = image;
    this.resetZoom();
    document.body.style.overflow = 'hidden';
  }

  closeFullScreenImage(): void {
    this.showFullScreenImage = null;
    this.resetZoom();
    document.body.style.overflow = 'auto';
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
  }

  mathMax(a: number, b: number): number {
    return Math.max(a, b);
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  zoomIn(): void {
    this.zoomLevel = this.mathMin(5, this.zoomLevel + 0.2);
    if (this.zoomLevel <= 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
  }

  zoomOut(): void {
    this.zoomLevel = this.mathMax(0.5, this.zoomLevel - 0.2);
    if (this.zoomLevel <= 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
  }

  isZoomAtMin(): boolean {
    return this.zoomLevel <= 0.5;
  }

  isZoomAtMax(): boolean {
    return this.zoomLevel >= 5;
  }

  isZoomReset(): boolean {
    return (
      this.zoomLevel === 1 && this.translateX === 0 && this.translateY === 0
    );
  }

  getZoomPercentage(): string {
    return (this.zoomLevel * 100).toFixed(0);
  }

  getImageTransform(): string {
    return `scale(${this.zoomLevel}) translate(${this.translateX}px, ${this.translateY}px)`;
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (this.showFullScreenImage) {
      event.preventDefault();

      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = this.mathMax(
        0.5,
        this.mathMin(5, this.zoomLevel + delta)
      );

      if (newZoom !== this.zoomLevel) {
        this.zoomLevel = newZoom;

        if (this.zoomLevel <= 1) {
          this.translateX = 0;
          this.translateY = 0;
        }
      }
    }
  }

  onMouseDown(event: MouseEvent): void {
    if (this.zoomLevel > 1) {
      this.isDragging = true;
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
      event.preventDefault();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.zoomLevel > 1) {
      const deltaX = event.clientX - this.lastPanX;
      const deltaY = event.clientY - this.lastPanY;

      this.translateX += deltaX / this.zoomLevel;
      this.translateY += deltaY / this.zoomLevel;

      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.isZooming = true;
      this.lastTouchDistance = this.getTouchDistance(event.touches);
    } else if (event.touches.length === 1 && this.zoomLevel > 1) {
      this.isDragging = true;
      this.lastPanX = event.touches[0].clientX;
      this.lastPanY = event.touches[0].clientY;
    }
    event.preventDefault();
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2 && this.isZooming) {
      const currentDistance = this.getTouchDistance(event.touches);
      const scale = currentDistance / this.lastTouchDistance;

      const newZoom = this.mathMax(
        0.5,
        this.mathMin(5, this.zoomLevel * scale)
      );
      this.zoomLevel = newZoom;

      this.lastTouchDistance = currentDistance;

      if (this.zoomLevel <= 1) {
        this.translateX = 0;
        this.translateY = 0;
      }
    } else if (
      event.touches.length === 1 &&
      this.isDragging &&
      this.zoomLevel > 1
    ) {
      const deltaX = event.touches[0].clientX - this.lastPanX;
      const deltaY = event.touches[0].clientY - this.lastPanY;

      this.translateX += deltaX / this.zoomLevel;
      this.translateY += deltaY / this.zoomLevel;

      this.lastPanX = event.touches[0].clientX;
      this.lastPanY = event.touches[0].clientY;
    }
    event.preventDefault();
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isDragging = false;
      this.isZooming = false;
    }
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private initializeImageStates(images: any[]): void {
    const states = new Map<string, ImageState>();

    images.forEach((image) => {
      states.set(image.imageUrl, {
        imageUrl: image.imageUrl,
        uploaded_at: image.uploaded_at,
        userUploaded_user: image.userUploaded_user,
        isLoaded: false,
        hasError: false,
      });
    });

    this.imageStates.set(states);
  }

  onImageLoad(imageUrl: string): void {
    const states = this.imageStates();
    const imageState = states.get(imageUrl);

    if (imageState) {
      const updatedStates = new Map(states);
      updatedStates.set(imageUrl, { ...imageState, isLoaded: true });
      this.imageStates.set(updatedStates);
    }
  }

  onImageError(imageUrl: string): void {
    const states = this.imageStates();
    const imageState = states.get(imageUrl);

    if (imageState) {
      const updatedStates = new Map(states);
      updatedStates.set(imageUrl, { ...imageState, hasError: true });
      this.imageStates.set(updatedStates);
    }
  }

  getImageState(imageUrl: string): ImageState | undefined {
    return this.imageStates().get(imageUrl);
  }

  trackByImageUrl(index: number, image: any): string {
    return image.imageUrl;
  }

  private addNewImageState(image: any): void {
  const currentStates = this.imageStates();
  const updatedStates = new Map(currentStates);
  
  updatedStates.set(image.imageUrl, {
    imageUrl: image.imageUrl,
    uploaded_at: image.uploaded_at,
    userUploaded_user: image.userUploaded_user,
    isLoaded: false,
    hasError: false
  });
  
  this.imageStates.set(updatedStates);
}

  async getUserId(): Promise<void> {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.userUid = userData.uid;
      this.username = userData.username;
      this.userImage = userData.imageUrl || null;
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          this.userUid = userData.uid;
          this.username = userData.username;
          this.userImage = userData.imageUrl || null;
        }
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (
      this.showImageActionsMenu &&
      this.menuContainer &&
      !this.menuContainer.nativeElement.contains(event.target)
    ) {
      this.showImageActionsMenu = false;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress(event: KeyboardEvent) {
    this.showImageActionsMenu = false;
    this.previewImage = '';
    this.closeFullScreenImage();
  }

  private initializeLottie(): void {
    this.dotLottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      autoplay: true,
      loop: true,
      speed: 0.3,
      src: 'https://lottie.host/c9c10062-2a95-4c4b-8c44-4b82f4ddf238/xjUwm8LxJ2.lottie',
    });
  }

  showFetchError(message: string) {
    this.generalError = message;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  formatDate(dateString: string): string {
    const eventDate = new Date(dateString);

    const daysOfWeek = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const dayName = daysOfWeek[eventDate.getDay()];
    const day = eventDate.getDate();
    const month = months[eventDate.getMonth()];
    const year = eventDate.getFullYear();
    const hours = eventDate.getHours().toString().padStart(2, '0');
    const minutes = eventDate.getMinutes().toString().padStart(2, '0');

    return `${dayName}, ${day} de ${month} de ${year} - ${hours}:${minutes}`;
  }

  formatImageDate(dateString: string): string {
    const eventDate = new Date(dateString);

    const day = eventDate.getDate().toString().padStart(2, '0');
    const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
    const year = eventDate.getFullYear();
    const hours = eventDate.getHours().toString().padStart(2, '0');
    const minutes = eventDate.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  }

  showFilterDescription(event: MouseEvent, filter: any) {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 200;
    const tooltipHeight = 60;
    const margin = 10;

    let top = rect.top - tooltipHeight - margin;

    if (top < 0) {
      top = rect.bottom + margin;
    }

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (left < margin) {
      left = margin;
    }

    if (left + tooltipWidth > window.innerWidth - margin) {
      left = window.innerWidth - tooltipWidth - margin;
    }

    this.tooltipPosition = { top, left };
    this.showDescriptionFilter = filter.description;
    this.showTooltip = true;
  }

  hideFilterDescription() {
    this.showTooltip = false;
    this.showDescriptionFilter = null;
  }

  toggleShowUploadedByLabel(imageUrl: string | null) {
    this.showUploadedByLabel = imageUrl;
  }

  checkShowJoinButtonAvailability() {
    if (this.eventInfo.public) {
      const eventEnds = new Date(this.eventInfo.ends);
      if (eventEnds >= this.today) {
        this.showJoinBtn = !this.eventInfo.user_joined_to_events.some(
          (user: any) => user.participant === this.userUid
        );
      }
    }
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showImageActionsMenu = !this.showImageActionsMenu;
  }

  startCamera() {
    this.showCamera = true;
  }

  handleImageCaptured(dataUrl: string) {
    this.previewImage = dataUrl;
    this.imageFile = this.dataURLtoFile(dataUrl, 'webcam_capture.jpg');
    this.showImageActionsMenu = false;
  }

  handleWebcamImage(dataUrl: string) {
    this.previewImage = dataUrl;
    this.imageFile = this.dataURLtoFile(dataUrl, 'webcam_capture.jpg');
    this.showImageActionsMenu = false;
  }

  private dataURLtoFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }

  handleImageChange(event: any) {
    const file = event.target.files[0];
    this.imageFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl as string;
        this.previewImage = base64;
      };
      reader.readAsDataURL(file);
    }
    this.showImageActionsMenu = false;
  }

  handleDeleteImage() {
    this.previewImage = '';
    this.imageFile = null;
    this.showImageActionsMenu = false;
  }

  private base64ToFile(base64: string, filename: string): File {
    return this.dataURLtoFile(base64, filename);
  }

  async handleUploadImage(event: any) {
    event.stopPropagation();
    if (this.previewImage !== '') {
      const file = this.base64ToFile(this.previewImage, 'event_image.jpg');
      const formData = new FormData();
      formData.append('file', file);
      if (this.userCanUploadImage) {
        this.loadingImageUpload = true;
        try {
          const response = await fetch(
            `${this.apiUrl}api/events/upload/${this.eventId}`,
            {
              method: 'POST',
              credentials: 'include',
              body: formData,
            }
          );

          const data = await response.json();
          if (response.ok) {
            this.previewImage = '';
            this.imageFile = null;
            this.showImageActionsMenu = false;
            let createdImage = data.datos;
            createdImage.userUploaded_user = {
              username: this.username,
              imageUrl: this.userImage,
            };
            this.eventInfo.event_images.unshift(createdImage);

            this.addNewImageState(createdImage);
          } else {
            this.showFetchError(data.mensaje);
          }
        } catch (error: any) {
          this.showFetchError(
            'Ha ocurrido un error al subir la imagen: ' + error.message
          );
        }
        this.loadingImageUpload = false;
      } else {
        this.showFetchError(
          'No tienes permisos para subir imágenes a este evento.'
        );
      }
    }
  }

  async joinEvent(event: any) {
    event.stopPropagation();
    this.loadingJoin = true;

    try {
      const response = await fetch(
        `${this.apiUrl}api/events/join/${this.eventId}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        this.showFetchError(data.mensaje);
      }
    } catch (error: any) {
      this.showFetchError(error.message);
    }

    this.loadingJoin = false;
  }

  async loadEventDetailedInfo() {
    this.loadingEventInfo = true;
    try {
      const response = await fetch(
        `${this.apiUrl}api/events/details/${this.eventId}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      const data = await response.json();
      if (response.ok) {
        this.eventInfo = data.datos.event;
        this.userCanUploadImage = data.datos.userCanUploadImages;

        if (this.eventInfo.event_images) {
          this.initializeImageStates(this.eventInfo.event_images);
        }

        // FILTRO PARA MOSTRAR PRIMERO EL CREADOR DEL EVENTO
        if (this.eventInfo.user_joined_to_events) {
          this.eventInfo.user_joined_to_events.sort((a: any, b: any) => {
            if (a.participant_user.uid === this.eventInfo.founder) return -1;
            if (b.participant_user.uid === this.eventInfo.founder) return 1;
            return 0;
          });
        }

        this.checkShowJoinButtonAvailability();

        if (!this.eventInfo) {
          this.eventNotShowingError =
            'No hemos podido encontrar el evento que querias ver, prueba a entrar de nuevo en el evento desde la pestaña de eventos.';
          setTimeout(() => {
            this.initializeLottie();
          }, 0);
        } else {
          this.eventNotShowingError = null;
        }
      } else {
        this.eventNotShowingError = data.mensaje;
        setTimeout(() => {
          this.initializeLottie();
        }, 0);
      }
    } catch (error: any) {
      this.eventNotShowingError =
        'Ha ocurrido un error al cargar la información del evento: ' +
        error.message;
      setTimeout(() => {
        this.initializeLottie();
      }, 0);
    }
    this.loadingEventInfo = false;
  }
}
