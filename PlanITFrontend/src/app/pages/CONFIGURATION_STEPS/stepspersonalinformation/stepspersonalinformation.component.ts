import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { LucideAngularModule } from 'lucide-angular';
import { InfodialogComponent } from '../../../components/infodialog/infodialog.component';

@Component({
  selector: 'app-stepspersonalinformation',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, InfodialogComponent],
  templateUrl: './stepspersonalinformation.component.html',
  styleUrl: './stepspersonalinformation.component.css'
})
export class StepspersonalinformationComponent {
  @Output() userInformation = new EventEmitter<any>();
  currentStep: number = 1;
  loadingPersonalInformation: boolean = false;
  personalInformationFormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    surname: new FormControl(''),
    birthdate: new FormControl('', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]),
    gender: new FormControl('', [Validators.required, Validators.pattern(/^(H|M|N)$/)]),
    address: new FormControl('')
  });
  helperTextVisible: string | null = null;
  nameError: string | null = null;
  birthdateError: string | null = null;
  genderError: string | null = null;
  generalInformation: string | null = null;
  private dotLottieInstance1!: DotLottie;
  private dotLottieInstance2!: DotLottie;
  private dotLottieInstance3!: DotLottie;
  private dotLottieInstance4!: DotLottie;

  ngOnInit() {
    this.personalInformationFormGroup.valueChanges.subscribe(() => {
      this.handleFormChanges();
    });
  }

  private handleFormChanges() {
    if (this.currentStep === 1) {
      if (!this.personalInformationFormGroup.controls.name.invalid) {
        this.nameError = null;
      } else if (this.personalInformationFormGroup.controls.name.hasError('required')) {
        this.nameError = 'Campo obligatorio';
      }
    }
    if (this.currentStep === 2) {
      if (!this.personalInformationFormGroup.controls.birthdate.invalid) {
        this.birthdateError = null;
      } else if (this.personalInformationFormGroup.controls.birthdate.hasError('required')) {
        this.birthdateError = 'Campo obligatorio';
      } else if (this.personalInformationFormGroup.controls.birthdate.hasError('pattern')) {
        this.birthdateError = 'Formato (aaaa-mm-dd)';
      }
    }
    if (this.currentStep === 3) {
      if (!this.personalInformationFormGroup.controls.gender.invalid) {
        this.genderError = null;
      } else if (this.personalInformationFormGroup.controls.gender.hasError('required')) {
        this.genderError = 'Campo obligatorio';
      } else if (this.personalInformationFormGroup.controls.gender.hasError('pattern')) {
        this.genderError = 'Seleccione un género';
      }
    }
  }

  @ViewChild('lottieCanvas1', { static: true })
  lottieCanvas1!: ElementRef<HTMLCanvasElement>;

  @ViewChild('lottieCanvas2', { static: true })
  lottieCanvas2!: ElementRef<HTMLCanvasElement>;

  @ViewChild('lottieCanvas3', { static: true })
  lottieCanvas3!: ElementRef<HTMLCanvasElement>;
  
  @ViewChild('lottieCanvas4', { static: true })
  lottieCanvas4!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    this.initializeLotties();
  }

  ngOnDestroy(): void {
    if (this.dotLottieInstance1) {
      this.dotLottieInstance1.destroy();
    }
    if (this.dotLottieInstance2) {
      this.dotLottieInstance2.destroy();
    }
    if (this.dotLottieInstance3) {
      this.dotLottieInstance3.destroy();
    }
    if (this.dotLottieInstance4) {
      this.dotLottieInstance4.destroy();
    }
  }

  private initializeLotties(): void {
    this.dotLottieInstance1 = new DotLottie({
      canvas: this.lottieCanvas1.nativeElement,
      autoplay: true,
      loop: true,
      src: 'https://lottie.host/1723c888-0fec-411a-bb20-e604aaa44bbc/GzTawknW9B.lottie',
    });
    this.dotLottieInstance2 = new DotLottie({
      canvas: this.lottieCanvas2.nativeElement,
      autoplay: true,
      loop: true,
      src: 'https://lottie.host/c23090ee-fd90-4727-9cf5-84c585ebc5ba/nq2pKrKXzD.lottie',
    });
    this.dotLottieInstance3 = new DotLottie({
      canvas: this.lottieCanvas3.nativeElement,
      autoplay: true,
      loop: true,
      src: 'https://lottie.host/2e0695f7-5d9f-4ead-ad16-494c439c882f/XtaGiiYxVX.lottie',
    });
    this.dotLottieInstance4 = new DotLottie({
      canvas: this.lottieCanvas4.nativeElement,
      autoplay: true,
      loop: true,
      src: 'https://lottie.host/020a2164-3e3e-4a39-81f1-f9d16d83a51c/suzjv7e4Pl.lottie',
    });
  }

  showHelperText(field: string) {
    this.helperTextVisible = field;
  }

  hideHelperText() {
    this.helperTextVisible = null;
  }

  showInformation(error: string) {
    this.generalInformation = error;
    setTimeout(() => {
      this.generalInformation = null;
    }
      , 5000);
  }

  changeStep(event: any | null, step: number) {
    if (event) {
      event.preventDefault();
    }
    if (step > this.currentStep) {
      if (this.currentStep === 1) {
        if (this.personalInformationFormGroup.controls.name.invalid) {
          this.showInformation('Por favor, rellene su nombre antes de continuar.');
          return;
        }
      } else if (this.currentStep === 2) {
        if (this.personalInformationFormGroup.controls.birthdate.invalid) {
          this.showInformation('Por favor, indique su fecha de nacimiento antes de continuar.');
          return;
        }
        const birthdateValue = this.personalInformationFormGroup.controls.birthdate.value;
        const fechaDeNacimiento = birthdateValue ? new Date(birthdateValue) : null;
        if (fechaDeNacimiento!! >= new Date()) {
          this.showInformation('La fecha de nacimiento no puede ser mayor a la fecha actual.');
          return;
        }
        if (fechaDeNacimiento!! < new Date('1900-01-01')) {
          this.showInformation('La fecha de nacimiento no puede ser menor a 1900-01-01.');
          return;
        }
      } else if (this.currentStep === 3) {
        if (this.personalInformationFormGroup.controls.gender.invalid) {
          this.showInformation('Por favor, indique su género.');
          return;
        }
      }
      this.currentStep = step;
    }
    this.currentStep = step;
  }

  sendUserInformation(event: any) {
    event.preventDefault();
    this.userInformation.emit(this.personalInformationFormGroup.value);
  }
}
