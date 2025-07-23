// Google Maps API Type Declarations
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
        InfoWindow: any;
        LatLngBounds: any;
        MapTypeId: {
          ROADMAP: string;
          SATELLITE: string;
        };
        MapTypeControlStyle: {
          HORIZONTAL_BAR: any;
        };
        ControlPosition: {
          TOP_CENTER: any;
        };
        SymbolPath: {
          CIRCLE: any;
        };
        Animation: {
          BOUNCE: any;
        };
        event: {
          addListenerOnce: (instance: any, eventName: string, handler: () => void) => any;
          trigger: (instance: any, eventName: string) => void;
        };
      };
    };
  }
}

export {};
