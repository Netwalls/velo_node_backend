import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class AddCompanyAndUserType1737542400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create companies table
    await queryRunner.createTable(
      new Table({
        name: "companies",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "companyName",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "companyEmail",
            type: "varchar",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "companyCode",
            type: "varchar",
            length: "8",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "isActive",
            type: "boolean",
            default: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
      true,
    );

    // Add userType column to users table
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "userType",
        type: "enum",
        enum: ["company", "employee", "individual"],
        default: "'individual'",
      }),
    );

    // Add companyId column to users table
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "companyId",
        type: "uuid",
        isNullable: true,
      }),
    );

    // Add position column to users table
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "position",
        type: "varchar",
        isNullable: true,
      }),
    );

    // Add salary column to users table
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "salary",
        type: "decimal",
        precision: 18,
        scale: 2,
        isNullable: true,
      }),
    );

    // Create foreign key for companyId
    await queryRunner.createForeignKey(
      "users",
      new TableForeignKey({
        columnNames: ["companyId"],
        referencedColumnNames: ["id"],
        referencedTableName: "companies",
        onDelete: "SET NULL",
      }),
    );

    // Create indexes for better performance
    await queryRunner.createIndex(
      "users",
      new TableIndex({
        name: "IDX_USERS_COMPANY_ID",
        columnNames: ["companyId"],
      }),
    );

    await queryRunner.createIndex(
      "companies",
      new TableIndex({
        name: "IDX_COMPANIES_CODE",
        columnNames: ["companyCode"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex("companies", "IDX_COMPANIES_CODE");
    await queryRunner.dropIndex("users", "IDX_USERS_COMPANY_ID");

    // Drop foreign key
    const table = await queryRunner.getTable("users");
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("companyId") !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey("users", foreignKey);
    }

    // Drop columns from users table
    await queryRunner.dropColumn("users", "salary");
    await queryRunner.dropColumn("users", "position");
    await queryRunner.dropColumn("users", "companyId");
    await queryRunner.dropColumn("users", "userType");

    // Drop companies table
    await queryRunner.dropTable("companies");
  }
}
