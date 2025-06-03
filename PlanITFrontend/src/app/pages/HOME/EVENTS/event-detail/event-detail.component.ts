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
import { MapsComponent } from '../COMPONENTS/maps/maps.component';

/**
 * Interface representing the state of an event image for loading and error handling.
 * 
 * @interface ImageState
 * @since 1.0.0
 */
interface ImageState {
  /** URL of the image */
  imageUrl: string;
  
  /** ISO date string when the image was uploaded */
  uploaded_at: string;
  
  /** Information about the user who uploaded the image */
  userUploaded_user: {
    /** Username of the uploader */
    username: string;
    /** Profile image URL of the uploader */
    imageUrl: string;
  };
  
  /** Whether the image has successfully loaded */
  isLoaded: boolean;
  
  /** Whether there was an error loading the image */
  hasError: boolean;
}

/**
 * Component for displaying detailed information about a specific event.
 * 
 * Features include:
 * - Event information display (name, description, dates, location)
 * - Image gallery with full-screen viewing capabilities
 * - Zoom and pan functionality for images
 * - Touch gestures support for mobile devices
 * - Image upload functionality for authorized users
 * - Event joining capability for public events
 * - Filter descriptions and participant lists
 * - Google Maps integration for location display
 * 
 * Advanced image viewing features:
 * - Mouse wheel zoom (0.5x to 5x)
 * - Touch pinch-to-zoom on mobile
 * - Pan/drag when zoomed in
 * - Keyboard navigation (arrow keys, escape)
 * - Swipe gestures for image navigation
 * 
 * @class EventDetailComponent
 * @since 1.0.0
 * @author Manuel Santos Márquez
 * 
 * @example
 * ```typescript
 * // Route: /home/events/details/:eventId
 * // Displays complete event information with interactive features
 * <app-event-detail></app-event-detail>
 * ```
 */
@Component({
  selector: 'app-event-detail',
  imports: [
    CommonModule,
    RouterLink,
    LoadinganimationComponent,
    InfodialogComponent,
    CamaraComponent,
    MapsComponent,
  ],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css',
})
export class EventDetailComponent {
  /** Event ID from route parameters */
  eventId!: string;
  
  /** API base URL for backend requests */
  apiUrl = apiUrl;
  
  /** Current user's unique identifier */
  userUid!: string;
  
  /** Current user's display name */
  username!: string;
  
  /** Current user's profile image URL */
  userImage!: string;

  /** Current date for event comparison */
  today = new Date();

  /** Error message displayed when event cannot be loaded properly */
  eventNotShowingError: string | null = null;

  /** Loading state for event information retrieval */
  loadingEventInfo = true;
  
  /** Detailed event information object */
  eventInfo: any | null = null;
  
  /** Flag indicating if current user can upload images to this event */
  userCanUploadImage = false;
  
  /** Flag to show/hide the join event button */
  showJoinBtn = false;
  
  /** Flag to control image actions menu visibility */
  showImageActionsMenu = false;

  /** Flag indicating if user can see images in the event */
  userCanSeeImages = false;
  
  /** Flag to control camera component visibility */
  showCamera = false;
  
  /** Base64 encoded preview image string */
  previewImage: string = '';
  
  /** File object for image upload */
  imageFile: File | null = null;

  /** Currently displayed full-screen image object */
  showFullScreenImage: any | null = null;
  
  /** Current zoom level for full-screen image (1 = 100%) */
  zoomLevel = 1;
  
  /** Horizontal translation offset for panned image */
  translateX = 0;
  
  /** Vertical translation offset for panned image */
  translateY = 0;
  
  /** Flag indicating if user is currently dragging the image */
  isDragging = false;
  
  /** Last recorded X position during pan gesture */
  lastPanX = 0;
  
  /** Last recorded Y position during pan gesture */
  lastPanY = 0;

  /** Last recorded distance between two touches for pinch-to-zoom */
  lastTouchDistance = 0;
  
  /** Flag indicating if user is currently performing pinch-to-zoom gesture */
  isZooming = false;

  /** Loading state for join event operation */
  loadingJoin = false;
  
  /** Loading state for image upload operation */
  loadingImageUpload = false;

  /** General error message for display to user */
  generalError: string | null = null;

  /** Label showing who uploaded a specific image */
  showUploadedByLabel: string | null = null;
  
  /** Filter object for event description display */
  showDescriptionFilter: any | null = null;
  
  /** Position coordinates for tooltip display */
  tooltipPosition = { top: 0, left: 0 };
  
  /** Flag to control tooltip visibility */
  showTooltip = false;

  /** Index of currently displayed image in full-screen mode */
  currentImageIndex = 0;
  
  /** Starting X coordinate for touch swipe gesture */
  private touchStartX = 0;
  
  /** Ending X coordinate for touch swipe gesture */
  private touchEndX = 0;
  
  /** Minimum distance threshold for swipe gesture recognition */
  private readonly swipeThreshold = 50;

  /** Signal containing map of image states for loading management */
  imageStates = signal<Map<string, ImageState>>(new Map());

  /** Subscription to route parameter changes */
  private paramSub?: Subscription;

  /** Lottie animation instance for error display */
  private dotLottieInstance!: DotLottie;

  /** Canvas element reference for Lottie animation */
  @ViewChild('lottieCanvas', { static: false })
  lottieCanvas!: ElementRef<HTMLCanvasElement>;

  /** Menu container element reference for click outside detection */
  @ViewChild('menuContainer') menuContainer!: ElementRef;
  constructor(private route: ActivatedRoute) {}

  /**
   * Initializes the component and subscribes to route parameters.
   * Sets up event ID and loads event information.
   * 
   * @returns Promise that resolves when initialization is complete
   * @throws Error if user authentication fails
   */
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

  /**
   * Initializes Lottie animation after view initialization if there's an error.
   * 
   * @returns void
   */
  ngAfterViewInit(): void {
    if (this.eventNotShowingError) {
      this.initializeLottie();
    }
  }

  /**
   * Cleans up resources when component is destroyed.
   * Destroys Lottie animation and unsubscribes from route parameters.
   * 
   * @returns void
   */
  ngOnDestroy(): void {
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
    }
    this.paramSub?.unsubscribe();
  }

  /**
   * Gets the index of the currently displayed image in the event images array.
   * 
   * @returns The index of the current image, or 0 if no image is displayed
   */
  getCurrentImageIndex(): number {
    if (!this.showFullScreenImage || !this.eventInfo?.event_images) {
      return 0;
    }
    return this.eventInfo.event_images.findIndex(
      (img: any) => img.imageUrl === this.showFullScreenImage.imageUrl
    );
  }

  /**
   * Navigates to the previous image in the gallery.
   * Resets zoom level when changing images.
   * 
   * @returns void
   */
  navigateToPreviousImage(): void {
    if (
      !this.eventInfo?.event_images ||
      this.eventInfo.event_images.length <= 1
    ) {
      return;
    }

    const currentIndex = this.getCurrentImageIndex();
    if (currentIndex > 0) {
      this.showFullScreenImage = this.eventInfo.event_images[currentIndex - 1];
      this.resetZoom();
    }
  }

  /**
   * Navigates to the next image in the gallery.
   * Resets zoom level when changing images.
   * 
   * @returns void
   */
  navigateToNextImage(): void {
    if (
      !this.eventInfo?.event_images ||
      this.eventInfo.event_images.length <= 1
    ) {
      return;
    }

    const currentIndex = this.getCurrentImageIndex();
    if (currentIndex < this.eventInfo.event_images.length - 1) {
      this.showFullScreenImage = this.eventInfo.event_images[currentIndex + 1];
      this.resetZoom();
    }
  }

  /**
   * Checks if there is a previous image available for navigation.
   * 
   * @returns True if there is a previous image, false otherwise
   */
  hasPreviousImage(): boolean {
    return this.getCurrentImageIndex() > 0;
  }

  /**
   * Checks if there is a next image available for navigation.
   * 
   * @returns True if there is a next image, false otherwise
   */
  hasNextImage(): boolean {
    const currentIndex = this.getCurrentImageIndex();
    return currentIndex < (this.eventInfo?.event_images?.length || 0) - 1;
  }

  /**
   * Opens an image in full-screen mode with zoom and pan capabilities.
   * Disables body scrolling to prevent background interaction.
   * 
   * @param image The image object to display in full-screen
   * @returns void
   */
  openFullScreenImage(image: any): void {
    this.showFullScreenImage = image;
    this.currentImageIndex = this.getCurrentImageIndex();
    this.resetZoom();
    document.body.style.overflow = 'hidden';
  }
  /**
   * Handles touch start events for swipe gesture recognition.
   * Records the starting X coordinate for swipe detection.
   * 
   * @param event Touch event containing touch information
   * @returns void
   */
  onImageTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.touchStartX = event.touches[0].clientX;
    }
  }

  /**
   * Handles touch end events for swipe gesture recognition.
   * Records the ending X coordinate and processes swipe gesture.
   * 
   * @param event Touch event containing touch information
   * @returns void
   */
  onImageTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length === 1) {
      this.touchEndX = event.changedTouches[0].clientX;
      this.handleSwipeGesture();
    }
  }

  /**
   * Processes swipe gestures for image navigation.
   * Navigates between images based on swipe direction and threshold.
   * 
   * @private
   * @returns void
   */
  private handleSwipeGesture(): void {
    const deltaX = this.touchEndX - this.touchStartX;

    if (Math.abs(deltaX) > this.swipeThreshold) {
      if (deltaX > 0 && this.hasPreviousImage()) {
        this.navigateToPreviousImage();
      } else if (deltaX < 0 && this.hasNextImage()) {
        this.navigateToNextImage();
      }
    }
  }

  /**
   * Closes the full-screen image view and restores normal page behavior.
   * Resets zoom level and re-enables body scrolling.
   * 
   * @returns void
   */
  closeFullScreenImage(): void {
    this.showFullScreenImage = null;
    this.resetZoom();
    document.body.style.overflow = 'auto';
  }

  /**
   * Resets zoom and pan values to their default state.
   * Used when changing images or closing full-screen view.
   * 
   * @returns void
   */
  resetZoom(): void {
    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
  }

  /**
   * Returns the maximum of two numbers.
   * Used for zoom level calculations.
   * 
   * @param a First number to compare
   * @param b Second number to compare
   * @returns The larger of the two numbers
   */
  mathMax(a: number, b: number): number {
    return Math.max(a, b);
  }

  /**
   * Returns the minimum of two numbers.
   * Used for zoom level calculations.
   * 
   * @param a First number to compare
   * @param b Second number to compare
   * @returns The smaller of the two numbers
   */
  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  /**
   * Increases the zoom level by 0.2x up to a maximum of 5x.
   * Resets translation when zoom level drops to 1x or below.
   * 
   * @returns void
   */
  zoomIn(): void {
    this.zoomLevel = this.mathMin(5, this.zoomLevel + 0.2);
    if (this.zoomLevel <= 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
  }

  /**
   * Decreases the zoom level by 0.2x down to a minimum of 0.5x.
   * Resets translation when zoom level drops to 1x or below.
   * 
   * @returns void
   */
  zoomOut(): void {
    this.zoomLevel = this.mathMax(0.5, this.zoomLevel - 0.2);
    if (this.zoomLevel <= 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
  }

  /**
   * Checks if the zoom level is at its minimum value.
   * 
   * @returns True if zoom is at minimum (0.5x), false otherwise
   */
  isZoomAtMin(): boolean {
    return this.zoomLevel <= 0.5;
  }

  /**
   * Checks if the zoom level is at its maximum value.
   * 
   * @returns True if zoom is at maximum (5x), false otherwise
   */
  isZoomAtMax(): boolean {
    return this.zoomLevel >= 5;
  }

  /**
   * Checks if the zoom and pan values are at their default state.
   * 
   * @returns True if zoom is 1x and image is centered, false otherwise
   */
  isZoomReset(): boolean {
    return (
      this.zoomLevel === 1 && this.translateX === 0 && this.translateY === 0
    );
  }

  /**
   * Gets the current zoom level as a percentage string.
   * 
   * @returns Zoom level as a percentage (e.g., "150")
   */
  getZoomPercentage(): string {
    return (this.zoomLevel * 100).toFixed(0);
  }

  /**
   * Generates the CSS transform string for image scaling and translation.
   * 
   * @returns CSS transform string for the image element
   */
  getImageTransform(): string {
    return `scale(${this.zoomLevel}) translate(${this.translateX}px, ${this.translateY}px)`;
  }
  /**
   * Handles mouse wheel events for zooming when in full-screen mode.
   * Prevents default scrolling behavior and adjusts zoom level.
   * 
   * @param event Wheel event containing scroll direction information
   * @returns void
   */
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

  /**
   * Handles keyboard events for full-screen image navigation.
   * Supports arrow keys for navigation and escape key to close.
   * 
   * @param event Keyboard event containing key information
   * @returns void
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.showFullScreenImage) {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (this.hasPreviousImage()) {
            this.navigateToPreviousImage();
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (this.hasNextImage()) {
            this.navigateToNextImage();
          }
          break;
        case 'Escape':
          event.preventDefault();
          this.closeFullScreenImage();
          break;
      }
    }
  }

  /**
   * Handles mouse down events to initiate drag operation when zoomed in.
   * Only enables dragging when zoom level is greater than 1x.
   * 
   * @param event Mouse event containing position information
   * @returns void
   */
  onMouseDown(event: MouseEvent): void {
    if (this.zoomLevel > 1) {
      this.isDragging = true;
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
      event.preventDefault();
    }
  }

  /**
   * Handles mouse move events for dragging zoomed images.
   * Updates image position based on mouse movement.
   * 
   * @param event Mouse event containing position information
   * @returns void
   */
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

  /**
   * Handles mouse up events to end drag operation.
   * 
   * @returns void
   */
  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }

  /**
   * Handles touch start events for pinch-to-zoom and drag operations.
   * Detects two-finger touch for zooming or single-finger touch for dragging.
   * 
   * @param event Touch event containing touch information
   * @returns void
   */
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

  /**
   * Handles touch move events for pinch-to-zoom and drag operations.
   * Processes two-finger pinch gestures for zooming or single-finger drag for panning.
   * 
   * @param event Touch event containing touch information
   * @returns void
   */
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

  /**
   * Handles touch end events to end zoom and drag operations.
   * 
   * @param event Touch event containing touch information
   * @returns void
   */
  onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isDragging = false;
      this.isZooming = false;
    }
  }

  /**
   * Calculates the distance between two touch points for pinch-to-zoom.
   * 
   * @private
   * @param touches Touch list containing two touch points
   * @returns Distance between the two touch points in pixels
   */
  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  /**
   * Initializes image states for all event images.
   * Creates a map with loading and error states for each image.
   * 
   * @private
   * @param images Array of image objects from the event
   * @returns void
   */
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

  /**
   * Handles successful image loading by updating the image state.
   * 
   * @param imageUrl URL of the successfully loaded image
   * @returns void
   */
  onImageLoad(imageUrl: string): void {
    const states = this.imageStates();
    const imageState = states.get(imageUrl);

    if (imageState) {
      const updatedStates = new Map(states);
      updatedStates.set(imageUrl, { ...imageState, isLoaded: true });
      this.imageStates.set(updatedStates);
    }
  }

  /**
   * Handles image loading errors by updating the image state.
   * 
   * @param imageUrl URL of the image that failed to load
   * @returns void
   */
  onImageError(imageUrl: string): void {
    const states = this.imageStates();
    const imageState = states.get(imageUrl);

    if (imageState) {
      const updatedStates = new Map(states);
      updatedStates.set(imageUrl, { ...imageState, hasError: true });
      this.imageStates.set(updatedStates);
    }
  }

  /**
   * Retrieves the state of a specific image.
   * 
   * @param imageUrl URL of the image to get state for
   * @returns Image state object or undefined if not found
   */
  getImageState(imageUrl: string): ImageState | undefined {
    return this.imageStates().get(imageUrl);
  }

  /**
   * TrackBy function for Angular *ngFor optimization.
   * 
   * @param index Index of the image in the array
   * @param image Image object
   * @returns Unique identifier for the image
   */
  trackByImageUrl(index: number, image: any): string {
    return image.imageUrl;
  }

  /**
   * Adds a new image state to the existing states map.
   * Used when a new image is uploaded to the event.
   * 
   * @private
   * @param image New image object to add state for
   * @returns void
   */
  private addNewImageState(image: any): void {
    const currentStates = this.imageStates();
    const updatedStates = new Map(currentStates);

    updatedStates.set(image.imageUrl, {
      imageUrl: image.imageUrl,
      uploaded_at: image.uploaded_at,
      userUploaded_user: image.userUploaded_user,
      isLoaded: false,
      hasError: false,
    });

    this.imageStates.set(updatedStates);
  }
  /**
   * Retrieves user information from session storage or Firebase authentication.
   * Sets user ID, username, and profile image for the current user.
   * 
   * @returns Promise that resolves when user ID is retrieved
   * @throws Error if user authentication fails
   */
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

  /**
   * Handles clicks outside the image actions menu to close it.
   * 
   * @param event Mouse event containing click target information
   * @returns void
   */
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

  /**
   * Handles escape key presses to close various UI elements.
   * Closes image actions menu, preview image, and full-screen image.
   * 
   * @param event Keyboard event for escape key
   * @returns void
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress(event: KeyboardEvent) {
    this.showImageActionsMenu = false;
    this.previewImage = '';
    this.closeFullScreenImage();
  }

  /**
   * Initializes the Lottie animation for error display.
   * 
   * @private
   * @returns void
   */
  private initializeLottie(): void {
    this.dotLottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      autoplay: true,
      loop: true,
      speed: 0.3,
      src: 'https://lottie.host/c9c10062-2a95-4c4b-8c44-4b82f4ddf238/xjUwm8LxJ2.lottie',
    });
  }

  /**
   * Displays an error message to the user for 5 seconds.
   * 
   * @param message Error message to display
   * @returns void
   */
  showFetchError(message: string) {
    this.generalError = message;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  /**
   * Formats a date string into a human-readable Spanish format.
   * 
   * @param dateString ISO date string to format
   * @returns Formatted date string (e.g., "Lunes, 15 de Enero de 2024 - 14:30")
   * 
   * @example
   * ```typescript
   * formatDate("2024-01-15T14:30:00Z") 
   * // Returns: "Lunes, 15 de Enero de 2024 - 14:30"
   * ```
   */
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
  /**
   * Formats a date string for image display in a shorter format.
   * 
   * @param dateString ISO date string to format
   * @returns Formatted date string (e.g., "15/01/2024 - 14:30")
   * 
   * @example
   * ```typescript
   * formatImageDate("2024-01-15T14:30:00Z") 
   * // Returns: "15/01/2024 - 14:30"
   * ```
   */
  formatImageDate(dateString: string): string {
    const eventDate = new Date(dateString);

    const day = eventDate.getDate().toString().padStart(2, '0');
    const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
    const year = eventDate.getFullYear();
    const hours = eventDate.getHours().toString().padStart(2, '0');
    const minutes = eventDate.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  }

  /**
   * Shows a tooltip with filter description at the appropriate position.
   * Calculates optimal position to avoid screen edges.
   * 
   * @param event Mouse event containing target element information
   * @param filter Filter object containing description
   * @returns void
   */
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

  /**
   * Hides the filter description tooltip.
   * 
   * @returns void
   */
  hideFilterDescription() {
    this.showTooltip = false;
    this.showDescriptionFilter = null;
  }

  /**
   * Toggles the display of who uploaded a specific image.
   * 
   * @param imageUrl URL of the image to show/hide uploader info for, or null to hide all
   * @returns void
   */
  toggleShowUploadedByLabel(imageUrl: string | null) {
    this.showUploadedByLabel = imageUrl;
  }

  /**
   * Checks if the join button should be displayed for the current event.
   * Shows join button for public events that haven't ended and user hasn't joined.
   * 
   * @returns void
   */
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
  /**
   * Checks if the event is in the future based on its start date.
   * 
   * @returns void
   */
  checkFutureEvent() {
    const eventStarts = new Date(this.eventInfo.starts);
    return eventStarts > this.today;
  }
  /**
   * Checks whether the user can see the images uploaded to the event only if he has joined the event.
   * 
   * @returns void
   */
  private checkUserCanSeeImages() {
    if (!this.eventInfo.public) {
      this.userCanSeeImages = true;
    } else {
      this.userCanSeeImages = this.eventInfo.user_joined_to_events.some(
        (user: any) => user.participant === this.userUid
      );
    }
  }
  /**
   * Toggles the image actions menu visibility.
   * 
   * @param event Mouse event to prevent event propagation
   * @returns void
   */
  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showImageActionsMenu = !this.showImageActionsMenu;
  }

  /**
   * Opens the camera component for capturing images.
   * 
   * @returns void
   */
  startCamera() {
    this.showCamera = true;
  }

  /**
   * Handles captured image from camera component.
   * 
   * @param dataUrl Base64 data URL of the captured image
   * @returns void
   */
  handleImageCaptured(dataUrl: string) {
    this.previewImage = dataUrl;
    this.imageFile = this.dataURLtoFile(dataUrl, 'webcam_capture.jpg');
    this.showImageActionsMenu = false;
  }

  /**
   * Handles image captured from webcam.
   * 
   * @param dataUrl Base64 data URL of the webcam image
   * @returns void
   */
  handleWebcamImage(dataUrl: string) {
    this.previewImage = dataUrl;
    this.imageFile = this.dataURLtoFile(dataUrl, 'webcam_capture.jpg');
    this.showImageActionsMenu = false;
  }

  /**
   * Converts a data URL to a File object.
   * 
   * @private
   * @param dataUrl Base64 data URL to convert
   * @param filename Name for the resulting file
   * @returns File object created from the data URL
   */
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

  /**
   * Handles file selection from input element.
   * Reads the selected file and sets it as preview image.
   * 
   * @param event File input change event
   * @returns void
   */
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

  /**
   * Clears the current preview image and file.
   * 
   * @returns void
   */
  handleDeleteImage() {
    this.previewImage = '';
    this.imageFile = null;
    this.showImageActionsMenu = false;
  }
  /**
   * Converts a base64 string to a File object.
   * 
   * @private
   * @param base64 Base64 encoded image string
   * @param filename Name for the resulting file
   * @returns File object created from the base64 string
   */
  private base64ToFile(base64: string, filename: string): File {
    return this.dataURLtoFile(base64, filename);
  }

  /**
   * Uploads the current preview image to the event.
   * Validates user permissions and handles the upload process.
   * 
   * @param event Event object to prevent propagation
   * @returns Promise that resolves when upload is complete
   * @throws Error if upload fails or user lacks permissions
   */
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

  /**
   * Joins the current user to the event.
   * Reloads the page on successful join to update the UI.
   * 
   * @param event Event object to prevent propagation
   * @returns Promise that resolves when join operation is complete
   * @throws Error if join operation fails
   */
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

  /**
   * Loads detailed information about the event from the backend.
   * Fetches event data, images, participants, and user permissions.
   * Sorts participants to show event founder first.
   * 
   * @returns Promise that resolves when event information is loaded
   * @throws Error if event loading fails
   */
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

        // Sort participants to show event founder first
        if (this.eventInfo.user_joined_to_events) {
          this.eventInfo.user_joined_to_events.sort((a: any, b: any) => {
            if (a.participant_user.uid === this.eventInfo.founder) return -1;
            if (b.participant_user.uid === this.eventInfo.founder) return 1;
            return 0;
          });
        }

        this.checkShowJoinButtonAvailability();
        this.checkUserCanSeeImages();
        

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
