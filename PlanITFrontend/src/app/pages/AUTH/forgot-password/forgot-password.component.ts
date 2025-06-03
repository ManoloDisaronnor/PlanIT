import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { InfodialogComponent } from '../../../components/infodialog/infodialog.component';
import { LoadinganimationComponent } from '../../../components/loadinganimation/loadinganimation.component';
import { apiUrl } from '../../../../../config/config';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, CommonModule, ReactiveFormsModule, LucideAngularModule, InfodialogComponent, LoadinganimationComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  forgotPasswordForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });
  
  emailError: string | null = null;
  generalError: string | null = null;
  helperTextVisible: string | null = null;
  loading: boolean = false;

  constructor(private router: Router) { }

  ngOnInit() {
    this.forgotPasswordForm.valueChanges.subscribe(() => {
      this.handleFormChanges(this.emailError !== null);
    });
  }

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
