CREATE TABLE `collection_swipes` (
	`collectionId` varchar(64) NOT NULL,
	`swipeId` varchar(64) NOT NULL,
	`addedAt` timestamp DEFAULT (now()),
	CONSTRAINT `collection_swipes_collectionId_swipeId_pk` PRIMARY KEY(`collectionId`,`swipeId`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isPublic` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `connected_mailboxes` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`emailAddress` varchar(255) NOT NULL,
	`oauthRefreshToken` text,
	`oauthAccessToken` text,
	`tokenExpiresAt` timestamp,
	`gmailHistoryId` varchar(50),
	`watchExpiresAt` timestamp,
	`isActive` boolean DEFAULT true,
	`lastSyncAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `connected_mailboxes_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_user_email` UNIQUE(`userId`,`emailAddress`)
);
--> statement-breakpoint
CREATE TABLE `email_swipes` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`mailboxId` varchar(64) NOT NULL,
	`gmailMessageId` varchar(255),
	`threadId` varchar(255),
	`subject` text,
	`senderEmail` varchar(255),
	`senderName` varchar(255),
	`recipientEmail` varchar(255),
	`receivedDate` timestamp,
	`htmlBody` text,
	`plainBody` text,
	`snippet` text,
	`isHtml` boolean DEFAULT true,
	`hasImages` boolean DEFAULT false,
	`aiClassification` text,
	`aiInsights` text,
	`embeddingVectorId` varchar(100),
	`isFavorite` boolean DEFAULT false,
	`notes` text,
	`manualTags` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `email_swipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_logs` (
	`id` varchar(64) NOT NULL,
	`jobType` varchar(100) NOT NULL,
	`status` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`payload` text,
	`error` text,
	`createdAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `job_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `swipe_tags` (
	`swipeId` varchar(64) NOT NULL,
	`tagId` varchar(64) NOT NULL,
	`confidenceScore` int,
	`isAiGenerated` boolean DEFAULT true,
	CONSTRAINT `swipe_tags_swipeId_tagId_pk` PRIMARY KEY(`swipeId`,`tagId`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` varchar(64) NOT NULL,
	`category` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_category_name` UNIQUE(`category`,`name`)
);
--> statement-breakpoint
CREATE INDEX `user_collections_idx` ON `collections` (`userId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `connected_mailboxes` (`userId`);--> statement-breakpoint
CREATE INDEX `user_swipes_idx` ON `email_swipes` (`userId`,`receivedDate`);--> statement-breakpoint
CREATE INDEX `sender_idx` ON `email_swipes` (`senderEmail`);--> statement-breakpoint
CREATE INDEX `mailbox_idx` ON `email_swipes` (`mailboxId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `job_logs` (`status`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `job_logs` (`createdAt`);