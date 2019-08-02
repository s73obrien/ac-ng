import { NgModule, ModuleWithProviders } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import NgAceJavascriptApiInterceptor from './ng-ace-javascript-api.interceptor';
import { ApiModule } from '../api';

@NgModule({
  imports: [ApiModule],
  exports: [ApiModule]
})
export class NgAceModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: NgAceModule,
      providers: [
        ApiModule,
        { provide: HTTP_INTERCEPTORS, useClass: NgAceJavascriptApiInterceptor, multi: true }
      ]
    };
  }
}
