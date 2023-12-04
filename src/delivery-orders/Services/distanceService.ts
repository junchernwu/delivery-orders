import { Injectable } from '@nestjs/common';
import {
  Client,
  DistanceMatrixResponse,
} from '@googlemaps/google-maps-services-js';
import { FailureGettingDistance } from '../ExceptionHandler/CustomErrors';

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
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      });

      return this.parseDistanceMatrixResponse(response);
    } catch (error) {
      throw new FailureGettingDistance();
    }
  }

  private parseDistanceMatrixResponse(
    response: DistanceMatrixResponse,
  ): number {
    // Parse the distance from the response
    return response.data.rows[0].elements[0].distance.value;
  }
}
