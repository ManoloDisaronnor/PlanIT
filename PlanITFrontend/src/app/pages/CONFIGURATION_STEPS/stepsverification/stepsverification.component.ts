import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { sendEmailVerification, User } from 'firebase/auth';
import { getCurrentUser } from '../../../../../config/authUser';

@Component({
  selector: 'app-stepsverification',
  imports: [],
  templateUrl: './stepsverification.component.html',
  styleUrl: './stepsverification.component.css'
})
export class StepsverificationComponent {
  @Output() userVerified = new EventEmitter<boolean>();
  user: User | null = null;
  emailVerified = false;
  counter = 60;
  private checkInterval: any;
  private dotLottieInstance!: DotLottie;

  verified(verificado: boolean) {
    this.userVerified.emit(verificado);
  }

  @ViewChild('lottieCanvas', { static: true })
  lottieCanvas!: ElementRef<HTMLCanvasElement>;

  async ngOnInit() {
    const user = await getCurrentUser();
    if (user) {
      this.user = user;
      if (!this.user!!.emailVerified) {
        if (!this.user!!.emailVerified) {
          sendEmailVerification(this.user!!)
            .catch(error => console.log('Error sending email verification:', error));
          this.startEmailVerificationCheck();
        }
      } else {
        this.emailVerified = true;
        this.counter = 60;
        this.dotLottieInstance.destroy();
        this.dotLottieInstance = new DotLottie({
          canvas: this.lottieCanvas.nativeElement,
          autoplay: true,
          loop: false,
          src: 'https://lottie.host/8aff232c-9734-45de-bab2-58aa6c84c632/oNYSSvlbw3.lottie',
        });
        clearInterval(this.checkInterval);
        setTimeout(() => {
          this.verified(this.emailVerified);
        }, 5000);
      }
    }
  }

  ngAfterViewInit(): void {
    this.initializeLottie();
  }

  ngOnDestroy(): void {
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  private initializeLottie(): void {
    this.dotLottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      autoplay: true,
      loop: true,
      src: 'https://lottie.host/81559d2b-6caa-4d0c-a97f-1d6de3bd5f4c/oVzR8aiHss.lottie',
    });
  }

  resendEmail() {
    if (!this.user!!.emailVerified) {
      sendEmailVerification(this.user!!);
      this.counter = 60;
    }
  }

  private startEmailVerificationCheck() {
    this.checkInterval = setInterval(async () => {
      await this.user?.reload();
      if (this.user?.emailVerified) {
        this.emailVerified = true;
        this.counter = 60;
        this.dotLottieInstance.destroy();
        this.dotLottieInstance = new DotLottie({
          canvas: this.lottieCanvas.nativeElement,
          autoplay: true,
          loop: false,
          src: 'https://lottie.host/8aff232c-9734-45de-bab2-58aa6c84c632/oNYSSvlbw3.lottie',
        });
        clearInterval(this.checkInterval);
        setTimeout(() => {
          this.verified(this.emailVerified);
        }, 5000);
      } else {
        if (this.counter !== 0) {
          this.counter--;
        }
      }
    }, 1000);
  }
}
