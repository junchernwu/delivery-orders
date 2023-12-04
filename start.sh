#!/bin/bash
echo "running mysql initialisation script"

mysql -u root -proot -e "USE $MYSQL_DATABASE;
CREATE TABLE DeliveryOrders (
  orderId varchar(36) NOT NULL,
  status enum('taken','unassigned') NOT NULL DEFAULT 'unassigned',
  distance int NOT NULL,
  dateTimeField datetime NOT NULL,
  PRIMARY KEY (orderId),
  INDEX idx_dateTimeField (dateTimeField)
);"


