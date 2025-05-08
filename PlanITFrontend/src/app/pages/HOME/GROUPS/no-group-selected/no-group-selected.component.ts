import { Component, ElementRef, ViewChild } from '@angular/core';
import { DotLottie } from '@lottiefiles/dotlottie-web';

@Component({
  selector: 'app-no-group-selected',
  imports: [],
  templateUrl: './no-group-selected.component.html',
  styleUrl: './no-group-selected.component.css'
})
export class NoGroupSelectedComponent {
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
      loop: false,
      speed: 1.2,
      src: 'https://lottie.host/d5403408-7850-417a-b505-62bf8ae14a96/KJFlkgVtfi.lottie',
    });
  }
}
