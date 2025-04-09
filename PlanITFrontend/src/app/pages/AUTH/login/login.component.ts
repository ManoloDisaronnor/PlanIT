import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { LucideAngularModule } from 'lucide-angular';
import { InfodialogComponent } from '../../../components/infodialog/infodialog.component';
import { LoadinganimationComponent } from '../../../components/loadinganimation/loadinganimation.component';
import { apiUrl } from '../../../../../config/config';
import { iniciarSesion } from '../../../../../config/authUser';

@Component({
  selector: 'app-login',
  imports: [RouterLink, CommonModule, ReactiveFormsModule, LucideAngularModule, InfodialogComponent, LoadinganimationComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });
  emailError: string | null = null;
  passwordError: string | null = null;
  generalError: string | null = null;
  helperTextVisible: string | null = null;
  loadingLogin: boolean = false;
  loadingGoogleLogin: boolean = false;
  showPassword: boolean = false;
  private dotLottieInstance!: DotLottie;

  constructor(private router: Router) { }

  ngOnInit() {
    this.loginForm.valueChanges.subscribe(() => {
      this.handleFormChanges(this.emailError !== null, this.passwordError !== null);
    });
  }

  @ViewChild('lottieCanvas', { static: true })
  lottieCanvas!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    this.initializeLottie();
  }

  ngOnDestroy(): void {
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
    }
  }

  private handleFormChanges(errorEmail: boolean, errorPassword: boolean) {
    if (errorEmail || errorPassword) {
      if (!this.loginForm.controls.email.invalid) {
        this.emailError = null;
      } else if (this.loginForm.controls.email.hasError('required')) {
        this.emailError = 'Campo obligatorio';
      } else if (this.loginForm.controls.email.hasError('email')) {
        this.emailError = 'Formato (abc@example.xxx)';
      }
      if (!this.loginForm.controls.password.invalid) {
        this.passwordError = null;
      } else if (this.loginForm.controls.password.hasError('required')) {
        this.passwordError = 'Campo obligatorio';
      } else if (this.loginForm.controls.password.hasError('minlength')) {
        this.passwordError = 'Mínimo 6 caracteres';
      }
    }
  }

  showHelperText(field: string) {
    this.helperTextVisible = field;
  }

  hideHelperText() {
    this.helperTextVisible = null;
  }

  showFetchError(error: string) {
    this.generalError = error;
    setTimeout(() => {
      this.generalError = null;
    }
      , 10000);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private initializeLottie(): void {
    this.dotLottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      autoplay: true,
      loop: true,
      src: 'https://lottie.host/eb59241d-141c-453f-9805-48dd11fe8a4f/H0IF4iepyP.lottie',
    });
  }

  async login(event: any) {
    event.preventDefault();
    if (this.loginForm.invalid) {
      this.handleFormChanges(true, true);
    } else {
      this.loadingLogin = true;
      try {
        const response = await fetch(`${apiUrl}auth/login`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: this.loginForm.value.email,
            password: this.loginForm.value.password
          })
        });
        const data = await response.json();
        if (response.ok) {
          await iniciarSesion(data.datos.email, this.loginForm.controls.password.value!!);
          this.router.navigate(['/home']);
        } else {
          this.showFetchError(data.mensaje);
          if (data.codError === 'EMAIL_NOT_FOUND') {
            this.emailError = 'No existente';
          } else if (data.codError === 'ERROR_AUTENTICACION') {
            this.passwordError = 'Contraseña incorrecta';
          }
        }
      } catch (error: any) {
        this.showFetchError(error.message);
      }
      this.loadingLogin = false;
    }
  }

  async loginWithGoogle() {
    this.loadingGoogleLogin = true;
    try {
      const response = await fetch(`${apiUrl}auth/google-auth-url`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        // Redirigir al usuario a la URL de autenticación de Google
        console.log(data.url);
        window.location.href = data.url;
      } else {
        this.showFetchError(data.mensaje || 'Error al iniciar sesión con Google');
      }
    } catch (error: any) {
      this.showFetchError(error.message || 'Error al conectar con el servidor');
    } finally {
      this.loadingGoogleLogin = false;
    }
  }

}
