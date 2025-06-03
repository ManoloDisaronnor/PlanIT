import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { MapsComponent } from '../COMPONENTS/maps/maps.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';
import { InfodialogComponent } from "../../../../components/infodialog/infodialog.component";
import { apiUrl } from '../../../../../../config/config';
import { localeEs, MbscModule } from '@mobiscroll/angular';
import { CamaraComponent } from "../../../../components/camara/camara.component";
import { LucideAngularModule } from 'lucide-angular';
import { LoadinganimationComponent } from "../../../../components/loadinganimation/loadinganimation.component";

/**
 * Componente para la creación de eventos
 * Permite a los usuarios crear eventos con ubicación, fecha, filtros y grupos invitados
 * Incluye validación de formularios, gestión de imágenes y integración con mapas
 * 
 * @class CreateEventsComponent
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Component({
  selector: 'app-create-events',
  imports: [CommonModule, MapsComponent, InfodialogComponent, MbscModule, FormsModule, ReactiveFormsModule, CamaraComponent, LucideAngularModule, LoadinganimationComponent],
  templateUrl: './create-events.component.html',
  styleUrl: './create-events.component.css'
})
export class CreateEventsComponent {  /** URL base de la API */
  apirUrl = apiUrl;
  
  /** Formulario reactivo para la creación de eventos */
  eventFormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    imageUrl: new FormControl(''),
    starts: new FormControl<Date | null>(null, [Validators.required]),
    ends: new FormControl<Date | null>(null, [Validators.required]),
    public: new FormControl(true, [Validators.required])
  });
  
  /** Filtros seleccionados para el evento */
  filtersSelected: any[] = [];
  /** Grupos seleccionados para invitar al evento */
  groupsSelected: any[] | null = null;
  /** Ubicación seleccionada en el mapa */
  selectedLocation: google.maps.LatLngLiteral | null = null;
  /** URL de preview de la imagen subida */
  previewImage: string = '';
  /** Archivo de imagen seleccionado */
  imageFile: File | null = null;
  /** Controla la visibilidad del menú de acciones de imagen */
  showImageActionsMenu = false;
  /** Controla la visibilidad de la cámara */
  showCamera: boolean = false;

  /** Longitud máxima permitida para el nombre del evento */
  nameMaxLength = 50;
  /** Longitud máxima permitida para la descripción del evento */
  descriptionMaxLength = 1500;

  /** Lista de todos los filtros disponibles */
  allFilters: any[] = [];
  /** Estado de expansión del filtro de vestimenta */
  clothingFilterExpanded = false;
  /** Estado de expansión del filtro de música */
  musicFilterExpanded = false;
  /** Estado de expansión del filtro de precios */
  pricingFilterExpanded = false;
  /** Estado de expansión del filtro de lugar */
  placeFilterExpanded = false;

  /** Configuración regional para Mobiscroll */
  localeEs = localeEs;

  /** Término de búsqueda de grupos */
  seacrhGroup: string = '';
  /** Subject para debounce de búsqueda de grupos */
  private searchDebouncer = new Subject<string>();
  /** Suscripción al observable de búsqueda */
  private searchSubscription: Subscription;
  /** Offset para paginación de grupos */
  groupOffset = 0;
  groupLimit = 10;
  noMoreGroups = false;
  noGroupsFound = false;
  groupList: any[] = [];
  groupListLoading = false;
  groupListLoadingMore = false;
  groupListError: string | null = null;

  nameError: string | null = null;
  dateError: string | null = null;
  privacityError: string | null = null;
  generalError: string | null = null;
  helperTextVisible: string | null = null;

  triedSubmited = false;
  loadingCreateEvent = false;

  @ViewChild('menuContainer') menuContainer!: ElementRef;

  constructor() {
    this.searchSubscription = this.searchDebouncer.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(async searchTerm => {
      this.seacrhGroup = searchTerm;
      this.groupOffset = 0;
      this.groupListLoading = true;
      this.groupListLoadingMore = false;
      this.groupList = [];
      await this.getGroups();
    });
  }

  ngOnInit() {
    this.eventFormGroup.valueChanges.subscribe(() => {
      this.handleFormChanges();
    });
  }

  async ngAfterViewInit() {
    await this.loadAllFilters();
  }

  ngAfterViewChecked() {
    const elements = document.querySelectorAll('div');
    elements.forEach(el => {
      if (el.textContent === 'TRIAL') {
        el.style.cssText = 'display: none !important; visibility: hidden !important';
      }
    });
  }

  ngOnDestroy() {
    this.searchSubscription.unsubscribe();
  }

  async loadAllFilters() {
    try {
      const response = await fetch(`${apiUrl}api/events/allfilters`, {
        method: 'GET',
      });

      const data = await response.json();
      if (response.ok) {
        this.allFilters = data.datos;
      } else {
        this.showFetchInformationError("Error al cargar los filtros: " + data.mensaje);
      }

    } catch (error: any) {
      this.showFetchInformationError("Error al cargar los filtros: " + error.message);
    }
  }

  async fetchGroupsForPrivacity() {
    if (this.groupList.length > 0 || this.groupListLoading) return;
    await this.getGroups();
  }

  async getGroups(reset: boolean = false, reloaded: boolean = false): Promise<void> {
    if (this.groupListLoading || this.noMoreGroups && !reloaded) return;

    this.groupListLoading = true;
    try {
      const response = await fetch(`${apiUrl}api/grupos/createevent?limit=${this.groupLimit}&offset=${this.groupOffset}&search=${this.seacrhGroup}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        const newGroups = data.datos;

        if (reset) {
          this.groupList = newGroups;
          this.groupOffset = newGroups.length;
        } else {
          this.groupList = [...this.groupList, ...newGroups];
          this.groupOffset += newGroups.length;
        }

        if (newGroups.length < this.groupLimit) {
          this.noMoreGroups = true;
        }
      } else {
        if (data.codError === 'NO_GROUPS_FOUND') {
          this.noGroupsFound = true;
        }
      }
    } catch (error) {
      this.showFetchInformationError('Error al cargar amigos: ' + error);
    } finally {
      this.groupListLoading = false;
    }
  }

  onScroll(event: any): void {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;

    if (atBottom && !this.groupListLoading && !this.noMoreGroups) {
      this.getGroups();
    }
  }

  toggleGroupSelection(group: any): void {
    group.checked = !group.checked;
    this.onGroupSelect(group);
  }

  onGroupSelect(group: any): void {
    if (!this.groupsSelected) {
      this.groupsSelected = [];
    }
    const existingIndex = this.groupsSelected.findIndex(g =>
      g.groups_group.id === group.groups_group.id);

    if (group.checked) {
      if (existingIndex === -1) {
        this.groupsSelected.push(group);
      }
    } else {
      if (existingIndex !== -1) {
        this.groupsSelected.splice(existingIndex, 1);
      }
    }
    if (this.groupsSelected.length === 0) {
      this.groupsSelected = null;
    }
    this.handleFormChanges();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.showImageActionsMenu && this.menuContainer && !this.menuContainer.nativeElement.contains(event.target)) {
      this.showImageActionsMenu = false;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress(event: KeyboardEvent) {
    this.showImageActionsMenu = false;
  }

  getCounterColor(remainingChars: number, maxLength: number): string {
    const percentage = (remainingChars / maxLength) * 100;

    if (percentage <= 5) {
      return '#ff0000';
    } else if (percentage <= 10) {
      return '#ff4d4d';
    } else {
      return '#a0a0d8';
    }
  }

  shouldShowCounter(remainingChars: number, maxLength: number): boolean {
    const percentage = (remainingChars / maxLength) * 100;
    return percentage <= 25;
  }

  get nameRemainingChars(): number {
    const currentLength = this.eventFormGroup.get('name')?.value?.length || 0;
    return this.nameMaxLength - currentLength;
  }
  get descriptionRemainingChars(): number {
    const currentLength = this.eventFormGroup.get('description')?.value?.length || 0;
    return this.descriptionMaxLength - currentLength;
  }

  private handleFormChanges(): boolean {
    if (this.triedSubmited) {
      if (!this.eventFormGroup.controls.name.invalid) {
        this.nameError = null;
      } else if (this.eventFormGroup.controls.name.hasError('required')) {
        this.nameError = 'Campo obligatorio';
      }
    }
    if (this.groupList.length > 0) {
      if (!this.groupsSelected) {
        this.groupListError = 'Selecciona al menos un grupo o establece el evento como público';
      } else {
        this.groupListError = null;
      }
    }
    if (this.eventFormGroup.controls.starts.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (this.eventFormGroup.controls.starts.value && this.eventFormGroup.controls.starts.value < today) {
        this.dateError = 'El evento no puede empezar en el pasado';
      } else {
        this.dateError = null;
      }
    } else {
      this.dateError = 'Seleccione la fecha y hora para el evento';
    }
    if (this.eventFormGroup.controls.ends.value) {
      if (this.eventFormGroup.controls.starts.value && this.eventFormGroup.controls.ends.value) {
        const startDate = new Date(this.eventFormGroup.controls.starts.value);
        const endDate = new Date(this.eventFormGroup.controls.ends.value);
        const diffInHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        
        if (diffInHours < 2) {
          this.dateError = 'El evento debe durar al menos 2 horas';
        } else if (endDate <= startDate) {
          this.dateError = 'La fecha de finalización debe ser posterior a la fecha de inicio';
        } else {
          this.dateError = null;
        }
      }
    } else if (!this.dateError) {
      this.dateError = 'Debe seleccionar la fecha y hora de finalización del evento';
    }

    return this.dateError === null || this.groupListError === null || this.nameError === null;
  }

  onDateRangeChange(event: any) {
    if (event.value) {
      this.eventFormGroup.get('starts')?.setValue(event.value[0]);
      this.eventFormGroup.get('ends')?.setValue(event.value[1]);
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

  onFilterSelected(filter: any) {
    if (filter.type === 'pricing') {
      if (filter.filter === 'Asistencia gratis') {
        const index = this.allFilters.findIndex((f) => f.filter === 'Asistencia pagada' && f.selected === true);
        if (index !== -1) {
          this.allFilters[index].selected = false;
          this.filtersSelected = this.filtersSelected.filter((f) => f.filter !== 'Asistencia pagada');
        }
      } else if (filter.filter === 'Asistencia pagada') {
        const index = this.allFilters.findIndex((f) => f.filter === 'Asistencia gratis' && f.selected === true);
        if (index !== -1) {
          this.allFilters[index].selected = false;
          this.filtersSelected = this.filtersSelected.filter((f) => f.filter !== 'Asistencia gratis');
        }
      }
    }
    this.allFilters.forEach((f) => {
      if (f.id === filter.id) {
        f.selected = !f.selected;
      }
    });
    if (filter.selected) {
      this.filtersSelected.push(filter);
    } else {
      this.filtersSelected = this.filtersSelected.filter((f) => f.id !== filter.id);
    }
  }

  showHelperText(field: string) {
    this.helperTextVisible = field;
  }

  hideHelperText() {
    this.helperTextVisible = null;
  }

  showFetchInformationError(error: string) {
    this.generalError = error;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  onLocationSelected(location: google.maps.LatLngLiteral) {
    this.selectedLocation = location;
  }

  async handleSubmit(event: any) {
    event.preventDefault();
    this.triedSubmited = true;
    if (this.handleFormChanges()) {
      this.loadingCreateEvent = true;
      const publicEvent = this.eventFormGroup.get('public')?.value;
      const formData = new FormData();
      formData.append('name', this.eventFormGroup.get('name')?.value || '');
      formData.append('description', this.eventFormGroup.get('description')?.value || '');
      formData.append('starts', this.eventFormGroup.get('starts')?.value ? new Date(this.eventFormGroup.get('starts')?.value as Date).toISOString() : '');
      formData.append('ends', this.eventFormGroup.get('ends')?.value ? new Date(this.eventFormGroup.get('ends')?.value as Date).toISOString() : '');
      formData.append('public', this.eventFormGroup.get('public')?.value ? 'true' : 'false');
      if (this.previewImage !== '') {
        formData.append('eventImage', this.base64ToFile(this.previewImage, 'event_image.jpg'));
      }
      formData.append('location', this.selectedLocation ? JSON.stringify(this.selectedLocation) : '[]');
      if (!publicEvent) {
        const groups = this.groupsSelected ? this.groupsSelected.map(group => ({
          id: group.groups_group.id
        })) : null;
        formData.append('groups', groups ? JSON.stringify(groups) : '[]');
      }
      if (this.filtersSelected.length > 0) {
        const filters = this.filtersSelected.map(filter => ({
          id: filter.id
        }));
        formData.append('filters', JSON.stringify(filters));
      }
      try {
        const response = await fetch(`${apiUrl}api/events/create`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (response.ok) {
          window.location.href = '/home/events/owned';
        } else {
          const data = await response.json();
          this.showFetchInformationError("Error al crear el evento: " + data.mensaje);
        }
      } catch (error: any) {
        this.showFetchInformationError("Error al crear el evento: " + error.message);
      }
      this.loadingCreateEvent = false;
    }
  }
}
