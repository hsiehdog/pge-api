import { ExampleModel } from "../data/models/exampleModel";

export class ExampleService {
  private exampleModel: ExampleModel;

  constructor() {
    this.exampleModel = new ExampleModel();
  }

  public async getExampleMessage(): Promise<{ message: string }> {
    const data = await this.exampleModel.getExampleData();
    return { message: data.message };
  }
}
