ALTER TABLE `users` ADD `passwordHash` varchar(255);
ALTER TABLE `users` MODIFY `email` varchar(320) NOT NULL;
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
