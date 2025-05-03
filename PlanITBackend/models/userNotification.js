const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('userNotification', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    notification: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'notification',
        key: 'id'
      }
    },
    user: {
      type: DataTypes.STRING(28),
      allowNull: false,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    readed: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'user_notification',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "FK1_id_notification",
        using: "BTREE",
        fields: [
          { name: "notification" },
        ]
      },
      {
        name: "FK2_uid_user",
        using: "BTREE",
        fields: [
          { name: "user" },
        ]
      },
    ]
  });
};
