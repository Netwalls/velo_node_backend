import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateBeneficiaryTable1737664000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "beneficiaries",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "userId",
            type: "uuid",
          },
          {
            name: "name",
            type: "varchar",
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "chain",
            type: "varchar",
          },
          {
            name: "network",
            type: "varchar",
          },
          {
            name: "recipients",
            type: "json",
          },
          {
            name: "recipientCount",
            type: "integer",
          },
          {
            name: "isActive",
            type: "boolean",
            default: true,
          },
          {
            name: "usageCount",
            type: "integer",
            default: 0,
          },
          {
            name: "lastUsedAt",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true
    );

    // Add foreign key for user
    await queryRunner.createForeignKey(
      "beneficiaries",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      })
    );

    // Create index on userId for faster lookups
    await queryRunner.query(
      `CREATE INDEX "IDX_beneficiaries_userId" ON "beneficiaries" ("userId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("beneficiaries");
  }
}
