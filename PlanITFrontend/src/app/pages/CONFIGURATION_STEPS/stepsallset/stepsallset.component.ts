import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DotLottie } from '@lottiefiles/dotlottie-web';

@Component({
  selector: 'app-stepsallset',
  imports: [RouterLink],
  templateUrl: './stepsallset.component.html',
  styleUrl: './stepsallset.component.css'
})
export class StepsallsetComponent {
  private dotLottieInstance!: DotLottie;

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

  private initializeLottie(): void {
    this.dotLottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      autoplay: true,
      loop: true,
      src: 'https://lottie.host/46bd8d37-eff5-48db-81d8-811690c25678/rPHys6QBdA.lottie',
    });
  }
}
