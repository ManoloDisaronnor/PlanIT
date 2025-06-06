import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { iniciarSesion, logOut } from '../../../../../config/authUser';
import { apiUrl } from '../../../../../config/config';
import { InfodialogComponent } from "../../../components/infodialog/infodialog.component";
import { LoadinganimationComponent } from '../../../components/loadinganimation/loadinganimation.component';

/**
 * Componente de registro de nuevos usuarios
 * Permite crear cuentas mediante email/contraseña con validación de formularios
 * Incluye manejo de errores y redirección automática tras registro exitoso
 * 
 * @class SignupComponent
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Component({
  selector: 'app-signup',
  imports: [RouterLink, LucideAngularModule, CommonModule, ReactiveFormsModule, InfodialogComponent, InfodialogComponent, LoadinganimationComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {  /** Formulario reactivo para el registro de usuarios */
  signUpForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });
  /** Error específico del campo email */
  emailError: string | null = null;
  /** Error específico del campo contraseña */
  passwordError: string | null = null;
  /** Error general del proceso de registro */
  generalError: string | null = null;
  /** Controla la visibilidad del texto de ayuda */
  helperTextVisible: string | null = null;
  /** Estado de carga durante el registro */
  loadingSignUp: boolean = false;
  /** Controla la visibilidad de la contraseña */
  showPassword: boolean = false;

  /**
   * Inicialización del componente
   * Cierra cualquier sesión existente y configura listeners del formulario
   */
  async ngOnInit() {
    await logOut();
    this.signUpForm.valueChanges.subscribe(() => {
      this.handleFormChanges(this.emailError !== null, this.passwordError !== null);
    });
  }

  /**
   * Maneja los cambios en el formulario y actualiza los errores correspondientes
   * 
   * @param {boolean} errorEmail - Indica si hay un error previo en el email
   * @param {boolean} errorPassword - Indica si hay un error previo en la contraseña
   * @private
   */
  private handleFormChanges(errorEmail: boolean, errorPassword: boolean) {
    if (errorEmail || errorPassword) {
      if (!this.signUpForm.controls.email.invalid) {
        this.emailError = null;
      } else if (this.signUpForm.controls.email.hasError('required')) {
        this.emailError = 'Campo obligatorio';
      } else if (this.signUpForm.controls.email.hasError('email')) {
        this.emailError = 'Formato (abc@example.xxx)';
      }
      if (!this.signUpForm.controls.password.invalid) {
        this.passwordError = null;
      } else if (this.signUpForm.controls.password.hasError('required')) {
        this.passwordError = 'Campo obligatorio';
      } else if (this.signUpForm.controls.password.hasError('minlength')) {
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
      , 5000);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }


  async signUp(event: any) {
    event.preventDefault();
    this.loadingSignUp = true;
    if (this.signUpForm.invalid) {
      this.handleFormChanges(true, true);
    } else {
      this.loadingSignUp = true;
      try {
        const response = await fetch(apiUrl + 'auth/firebasesignup', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: this.signUpForm.controls.email.value,
            password: this.signUpForm.controls.password.value
          })
        });
        const data = await response.json();
        if (response.ok) {
          await iniciarSesion(data.datos.email, this.signUpForm.controls.password.value!!);
          window.location.href = '/configuration-steps';
        } else {
          if (data.mensaje === 'Error al crear el usuarioError: The email address is already in use by another account.') {
            this.emailError = 'El correo electrónico ya está en uso';
          }
          this.showFetchError(data.mensaje);
        }
      } catch (error: any) {
        this.showFetchError(error.message);
      }
      this.loadingSignUp = false;
    }
    this.loadingSignUp = false;
  }
}
