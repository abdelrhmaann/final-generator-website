CREATE TABLE `calculation_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionKey` varchar(64) NOT NULL,
	`projectName` varchar(255),
	`engineerName` varchar(255),
	`projectRef` varchar(128),
	`calcDate` varchar(32),
	`moduleType` varchar(64) NOT NULL,
	`inputData` json NOT NULL,
	`resultData` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calculation_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `calculation_sessions_sessionKey_unique` UNIQUE(`sessionKey`)
);
