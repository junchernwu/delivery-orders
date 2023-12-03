import { Injectable } from '@nestjs/common';
import {
  Client,
  DistanceMatrixResponse,
} from '@googlemaps/google-maps-services-js';

@Injectable()
export class DistanceService {
  private readonly client: Client;

  constructor() {
    this.client = new Client({});
  }

  async getDistance(origin: string[], destination: string[]): Promise<number> {
    try {
      const response = await this.client.distancematrix({
        params: {
          origins: [`${origin[0]},${origin[1]}`],
          destinations: [`${destination[0]},${destination[1]}`],
          key: 'AIzaSyC_61Oky5qRv9M6nT1IB9kojl7j_OTQGx4',
        },
      });

      return this.parseDistanceMatrixResponse(response);
      // Handle the result
    } catch (error) {
      console.log(error);
    }
  }

  private parseDistanceMatrixResponse(
    response: DistanceMatrixResponse,
  ): number {
    // Parse the distance from the response
    return response.data.rows[0].elements[0].distance.value;
  }
}
