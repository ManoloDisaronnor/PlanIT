import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DotLottie } from '@lottiefiles/dotlottie-web';

@Component({
  selector: 'app-notfound',
  imports: [RouterLink],
  templateUrl: './notfound.component.html',
  styleUrl: './notfound.component.css'
})
export class NotfoundComponent {
  private dotLottieInstance!: DotLottie;

  @ViewChild('lottieCanvas', { static: true })
  lottieCanvas!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    this.initializeLotties();
  }

  private initializeLotties(): void {
    this.dotLottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      autoplay: true,
      loop: true,
      src: 'https://lottie.host/300343ae-855c-4ddb-bd34-c86d82dfee0a/Uy9AgsMwp3.lottie',
    });
  }
}
