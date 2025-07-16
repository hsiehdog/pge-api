export interface ExampleData {
  message: string;
}

export class ExampleModel {
  public async getExampleData(): Promise<ExampleData> {
    // In a real application, this would fetch data from a database
    // For now, we'll return mock data
    return { message: "Example route works!" };
  }
}
