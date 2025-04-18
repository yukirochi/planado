/*CREATE TABLE faculty (
     ID int NOT NULL,
    prof varchar(255) NOT NULL,
    subject varchar(255),
    PRIMARY KEY (ID)
)*/


/*ALTER TABLE feedback MODIFY COLUMN ID int NOT NULL AUTO_INCREMENT;*/


/*ALTER TABLE rooms ADD prof varchar(255)*/

/* FROM rooms*/

/*INSERT INTO faculty ( prof, subject ) VALUES ("ENGR SAN PASCUAL", "FEC 1")*/

UPDATE users SET role = "admin" WHERE email = 'otter@example.com'