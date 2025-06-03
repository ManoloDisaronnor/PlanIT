import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { InfodialogComponent } from '../../../components/infodialog/infodialog.component';
import { LoadinganimationComponent } from '../../../components/loadinganimation/loadinganimation.component';
import { apiUrl } from '../../../../../config/config';

/**
 * Componente para la recuperación de contraseña olvidada
 * Permite al usuario solicitar un restablecimiento de contraseña mediante email
 * Incluye validación de formulario y manejo de errores
 * 
 * @class ForgotPasswordComponent
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, CommonModule, ReactiveFormsModule, LucideAngularModule, InfodialogComponent, LoadinganimationComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {  /** Formulario reactivo para la solicitud de recuperación de contraseña */
  forgotPasswordForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });
  
  /** Error específico del campo email */
  emailError: string | null = null;
  /** Error general del proceso */
  generalError: string | null = null;
  /** Controla la visibilidad del texto de ayuda */
  helperTextVisible: string | null = null;
  /** Estado de carga durante el envío de la solicitud */
  loading: boolean = false;

  constructor(private router: Router) { }

  /**
   * Inicialización del componente
   * Configura listeners para cambios en el formulario
   */
  ngOnInit() {
    this.forgotPasswordForm.valueChanges.subscribe(() => {
      this.handleFormChanges(this.emailError !== null);
    });
  }

  /**
   * Maneja los cambios en el formulario y actualiza los errores correspondientes
   * 
   * @param {boolean} errorEmail - Indica si hay un error previo en el email
   * @private
   */
  private handleFormChanges(errorEmail: boolean) {
    if (errorEmail) {
      if (!this.forgotPasswordForm.controls.email.invalid) {
        this.emailError = null;
      } else if (this.forgotPasswordForm.controls.email.hasError('required')) {
        this.emailError = 'Campo obligatorio';
      } else if (this.forgotPasswordForm.controls.email.hasError('email')) {
        this.emailError = 'Formato (abc@example.xxx)';
      }
    }
  }
  /**
   * Muestra el texto de ayuda para un campo específico
   * 
   * @param {string} field - Nombre del campo para mostrar ayuda
   * 
   * @example
   * ```typescript
   * showHelperText('email');
   * ```
   */
  showHelperText(field: string) {
    this.helperTextVisible = field;
  }

  /**
   * Oculta el texto de ayuda actualmente visible
   */
  hideHelperText() {
    this.helperTextVisible = null;
  }

  showFetchError(error: string) {
    this.generalError = error;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  async sendPasswordReset(event: any) {
    event.preventDefault();
    if (this.forgotPasswordForm.invalid) {
      this.handleFormChanges(true);
    } else {
      this.loading = true;
      try {
        const response = await fetch(`${apiUrl}auth/forgot-password`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: this.forgotPasswordForm.value.email
          })
        });

        const data = await response.json();

        if (response.ok) {
          this.router.navigate(['/auth/login'], { 
            queryParams: { error: 'Se ha enviado un correo para reestablecer la contraseña' } 
          });
        } else {
          this.showFetchError(data.mensaje);
          if (data.codError === 'EMAIL_NOT_FOUND') {
            this.emailError = 'No existe una cuenta con este email';
          }
        }
      } catch (error: any) {
        this.showFetchError(error.message || 'Error al conectar con el servidor');
      } finally {
        this.loading = false;
      }
    }
  }
}
