const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('messagesUser', {
    message: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'message',
        key: 'id'
      }
    },
    user: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    featured: {
      type: DataTypes.TINYINT,
      allowNull: false
    },
    readed: {
      type: DataTypes.TINYINT,
      allowNull: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'messages_user',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "message" },
          { name: "user" },
        ]
      },
      {
        name: "FK1_message_user",
        using: "BTREE",
        fields: [
          { name: "user" },
        ]
      },
    ]
  });
};
