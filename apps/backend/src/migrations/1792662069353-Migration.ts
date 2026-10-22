import type { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1792662069353 implements MigrationInterface {
	name = "Migration1792662069353";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE \`booking_series\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`title\` varchar(100) NOT NULL, \`day_of_week\` tinyint NOT NULL, \`start_time\` time NOT NULL, \`end_time\` time NOT NULL, \`start_date\` date NOT NULL, \`end_date\` date NOT NULL, \`created_at\` datetime NOT NULL, \`user_id\` bigint NOT NULL, \`reserved_for_user_id\` bigint NOT NULL, \`classroom_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
		);
		await queryRunner.query(
			`ALTER TABLE \`booking\` ADD \`series_id\` bigint NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE \`booking_series\` ADD CONSTRAINT \`FK_acd08cb12a318bd555b2cccdefe\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE \`booking_series\` ADD CONSTRAINT \`FK_44ce3827f1472eaefc96170f543\` FOREIGN KEY (\`reserved_for_user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE \`booking_series\` ADD CONSTRAINT \`FK_5591a405551a4f938f633fd8845\` FOREIGN KEY (\`classroom_id\`) REFERENCES \`classroom\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE \`booking\` ADD CONSTRAINT \`FK_d9121388a3326c119114075fb61\` FOREIGN KEY (\`series_id\`) REFERENCES \`booking_series\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE \`booking\` DROP FOREIGN KEY \`FK_d9121388a3326c119114075fb61\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`booking_series\` DROP FOREIGN KEY \`FK_5591a405551a4f938f633fd8845\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`booking_series\` DROP FOREIGN KEY \`FK_44ce3827f1472eaefc96170f543\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`booking_series\` DROP FOREIGN KEY \`FK_acd08cb12a318bd555b2cccdefe\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`booking\` DROP COLUMN \`series_id\``,
		);
		await queryRunner.query(`DROP TABLE \`booking_series\``);
	}
}
