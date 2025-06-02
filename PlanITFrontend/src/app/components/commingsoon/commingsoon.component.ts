import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { DotLottie } from '@lottiefiles/dotlottie-web';

@Component({
  selector: 'app-commingsoon',
  imports: [],
  templateUrl: './commingsoon.component.html',
  styleUrl: './commingsoon.component.css',
})
export class CommingsoonComponent {
  @Input() futureFeatures: string[] = [];

  private dotLottieInstance!: DotLottie;

  @ViewChild('lottieCanvas', { static: true })
  lottieCanvas!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    this.initializeLottie();
  }

  private initializeLottie(): void {
    this.dotLottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      autoplay: true,
      loop: true,
      speed: 0.7,
      src: 'https://lottie.host/9ae62d9a-bf63-43f9-9bdc-253718c124e7/hZHlCQU23j.lottie',
    });
  }
}
