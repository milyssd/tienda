CREATE TABLE `DownloadLog` (
 `id` VARCHAR(191) NOT NULL,
 `orderId` VARCHAR(191) NOT NULL,
 `productId` VARCHAR(191) NOT NULL,
 `userId` VARCHAR(191) NOT NULL,
 `ip` VARCHAR(191) NOT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX `DownloadLog_orderId_productId_idx` (`orderId`,`productId`),
 PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
