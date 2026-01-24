import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateEmployeeTable1737663600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "employees",
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
            name: "companyId",
            type: "uuid",
          },
          {
            name: "companyCode",
            type: "varchar",
          },
          {
            name: "employeeId",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "firstName",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "lastName",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "email",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "phoneNumber",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "position",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "department",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "salary",
            type: "decimal",
            precision: 18,
            scale: 2,
            isNullable: true,
          },
          {
            name: "salaryCurrency",
            type: "varchar",
            default: "'USD'",
          },
          {
            name: "walletAddress",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "preferredChain",
            type: "varchar",
            default: "'solana'",
          },
          {
            name: "employmentStatus",
            type: "enum",
            enum: ["active", "inactive", "on_leave", "terminated"],
            default: "'active'",
          },
          {
            name: "hireDate",
            type: "date",
            isNullable: true,
          },
          {
            name: "terminationDate",
            type: "date",
            isNullable: true,
          },
          {
            name: "kycStatus",
            type: "enum",
            enum: ["pending", "submitted", "in_review", "approved", "rejected"],
            default: "'pending'",
          },
          {
            name: "paymentPreferences",
            type: "json",
            isNullable: true,
          },
          {
            name: "isActive",
            type: "boolean",
            default: true,
          },
          {
            name: "notes",
            type: "text",
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
      "employees",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      })
    );

    // Add foreign key for company
    await queryRunner.createForeignKey(
      "employees",
      new TableForeignKey({
        columnNames: ["companyId"],
        referencedColumnNames: ["id"],
        referencedTableName: "companies",
        onDelete: "CASCADE",
      })
    );

    // Create index on companyCode for faster lookups
    await queryRunner.query(
      `CREATE INDEX "IDX_employees_companyCode" ON "employees" ("companyCode")`
    );

    // Create index on walletAddress for faster lookups
    await queryRunner.query(
      `CREATE INDEX "IDX_employees_walletAddress" ON "employees" ("walletAddress")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("employees");
  }
}
