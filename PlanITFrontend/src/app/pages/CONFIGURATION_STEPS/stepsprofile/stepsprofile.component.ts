import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { firstValueFrom, Subject, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiUrl } from '../../../../../config/config';
import { LucideAngularModule } from 'lucide-angular';
import { InfodialogComponent } from '../../../components/infodialog/infodialog.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LoadinganimationComponent } from '../../../components/loadinganimation/loadinganimation.component';

@Component({
  selector: 'app-stepsprofile',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, InfodialogComponent, LoadinganimationComponent],
  templateUrl: './stepsprofile.component.html',
  styleUrl: './stepsprofile.component.css'
})
export class StepsprofileComponent {
  @Input() uid: string | undefined = '';
  @Output() continue = new EventEmitter<any>();
  @Output() openCamara = new EventEmitter<void>();
  profileFormGroup = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(4)]),
    aboutme: new FormControl(''),
  });
  generalError: string | null = null;
  helperTextVisible: string | null = null;
  loadingUsernameAvailability: boolean = false;
  loadingSubmit: boolean = false;
  usernameInUse: boolean = false;
  usernameError: string | null = null;
  stream: any = null;
  trigger: Subject<void> = new Subject();
  previewImage: string = '';
  imageFile: File | null = null;
  showImageActionsMenu: boolean = false;

  private usernameDebouncer = new Subject<string>();
  private debounceSubscription: Subscription;

  @ViewChild('menuContainer') menuContainer!: ElementRef;

  constructor(private http: HttpClient) {
    this.debounceSubscription = this.usernameDebouncer.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(value => {
      this.handleFormChanges();
    });
  }

  async ngOnInit() {
    this.profileFormGroup.valueChanges.subscribe(() => {
      this.usernameDebouncer.next(this.profileFormGroup.controls.username.value || '');
    });
  }

  ngOnDestroy() {
    this.debounceSubscription.unsubscribe();
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showImageActionsMenu = !this.showImageActionsMenu;
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

  private async handleFormChanges() {
    this.loadingUsernameAvailability = true;
    this.usernameInUse = await this.checkUsernameAvailability();
    if (!this.profileFormGroup.controls.username.invalid && this.usernameInUse) {
      this.usernameError = null;
    } else if (this.profileFormGroup.controls.username.hasError('required')) {
      this.usernameError = 'Campo obligatorio';
    } else if (this.profileFormGroup.controls.username.hasError('minlength')) {
      this.usernameError = 'Mínimo 4 caracteres';
    } else {
      this.usernameError = 'Nombre de usuario no disponible';
    }
    this.loadingUsernameAvailability = false;
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

  showHelperText(field: string) {
    this.helperTextVisible = field;
  }

  hideHelperText() {
    this.helperTextVisible = null;
  }

  async checkUsernameAvailability(): Promise<boolean> {
    try {
      const username = this.profileFormGroup.controls.username.value;
      const response = await fetch(`${apiUrl}usuarios/checkusername/${username}`, {
        method: 'GET',
      });
      return response.ok
    } catch (error) {
      this.generalError = 'Error al verificar la disponibilidad del nombre de usuario:', error;
      return false;
    }
  }

  async handleSubmit(event: any) {
    event.preventDefault();
    this.loadingSubmit = true;
    if (this.previewImage !== '') {
      if (await this.checkUsernameAvailability()) {
        try {
          const fileName = `${this.uid}_profile.jpg`;
          const file = this.base64ToFile(this.previewImage, fileName);

          const formData = new FormData();
          formData.append('profileImage', file);

          try {
            const response = await fetch(`${apiUrl}usuarios/uploadprofilepicture`, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });
            const data = await response.json();
            if (response.ok) {
              this.continueTo({
                imageUrl: data.datos.fileUrl,
                username: this.profileFormGroup.controls.username.value,
                aboutme: this.profileFormGroup.controls.aboutme.value,
              })
            } else {
              this.generalError = 'Error al subir la imagen: ' + data.mensaje;
            }
          } catch (httpError: any) {
            this.generalError = 'Error al subir la imagen: ' + httpError.error.message;
          }
        } catch (error: any) {
          this.generalError = 'Error al convertir la imagen: ' + error.message;
        }
      }
    } else {
      this.continueTo({
        imageUrl: '',
        username: this.profileFormGroup.controls.username.value,
        aboutme: this.profileFormGroup.controls.aboutme.value,
      })
    }
    this.loadingSubmit = false;
  }

  continueTo(next: any) {
    this.continue.emit(next);
  }

  startCamara() {
    this.showImageActionsMenu = false;
    this.openCamara.emit();
  }

}